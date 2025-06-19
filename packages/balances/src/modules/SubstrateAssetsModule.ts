import { TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { assert } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
import { ChainConnector } from "@talismn/chain-connector"
import {
  BalancesConfigTokenParams,
  ChaindataProvider,
  DotNetworkId,
  parseSubAssetTokenId,
  SubAssetsToken,
  subAssetTokenId,
} from "@talismn/chaindata-provider"
import {
  compactMetadata,
  decAnyMetadata,
  decodeScale,
  encodeMetadata,
  getDynamicBuilder,
  getLookupFn,
  unifyMetadata,
} from "@talismn/scale"
import { keys, toPairs } from "lodash"
import camelCase from "lodash/camelCase"
import { Binary } from "polkadot-api"

import {
  ChainMeta,
  DefaultBalanceModule,
  NewBalanceModule,
  NewTransferParamsType,
} from "../BalanceModule"
import { getMiniMetadata } from "../getMiniMetadata"
import log from "../log"
import { AddressesByToken, AmountWithLabel, Balances, NewBalanceType } from "../types"
import { buildNetworkStorageCoders, RpcStateQuery, RpcStateQueryHelper } from "./util"

type ModuleType = "substrate-assets"
const moduleType: ModuleType = "substrate-assets"

export type SubAssetsChainMeta = ChainMeta<null>

const UNSUPPORTED_CHAIN_META: SubAssetsChainMeta = { miniMetadata: null, extra: null }

export type SubAssetsModuleConfig = {
  tokens?: Array<
    {
      assetId: number | string
    } & BalancesConfigTokenParams
  >
}

export type SubAssetsBalance = NewBalanceType<ModuleType, "complex">

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "substrate-assets": SubAssetsBalance
  }
}

export type SubAssetsTransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  userExtensions?: ExtDef
}>

export const SubAssetsModule: NewBalanceModule<
  ModuleType,
  SubAssetsToken,
  SubAssetsChainMeta,
  SubAssetsModuleConfig,
  SubAssetsTransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")

  return {
    ...DefaultBalanceModule(moduleType),

    // TODO make synchronous at the module definition level ?
    async fetchSubstrateChainMeta(chainId, moduleConfig, metadataRpc) {
      if (!metadataRpc) return UNSUPPORTED_CHAIN_META

      const metadata = decAnyMetadata(metadataRpc)

      compactMetadata(metadata, [{ pallet: "Assets", items: ["Account", "Asset", "Metadata"] }])

      const miniMetadata = encodeMetadata(metadata)

      return { miniMetadata, extra: null }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      if ((moduleConfig?.tokens ?? []).length < 1) return {}

      const { miniMetadata } = chainMeta
      if (!miniMetadata) return {}

      const metadata = unifyMetadata(decAnyMetadata(miniMetadata))
      const scaleBuilder = getDynamicBuilder(getLookupFn(metadata))
      const assetCoder = scaleBuilder.buildStorage("Assets", "Asset")
      const metadataCoder = scaleBuilder.buildStorage("Assets", "Metadata")

      const tokens: Record<string, SubAssetsToken> = {}
      for (const tokenConfig of moduleConfig?.tokens ?? []) {
        try {
          const assetId = String(tokenConfig.assetId)

          const assetStateKey =
            tryEncode(assetCoder, BigInt(assetId)) ?? tryEncode(assetCoder, assetId)
          const metadataStateKey =
            tryEncode(metadataCoder, BigInt(assetId)) ?? tryEncode(metadataCoder, assetId)

          if (assetStateKey === null || metadataStateKey === null)
            throw new Error(`Failed to encode stateKey for asset ${assetId} on chain ${chainId}`)

          type AssetResult = {
            accounts?: number
            admin?: string
            approvals?: number
            deposit?: bigint
            freezer?: string
            is_sufficient?: boolean
            issuer?: string
            min_balance?: bigint
            owner?: string
            status?: unknown
            sufficients?: number
            supply?: bigint
          }
          type MetadataResult = {
            decimals?: number
            deposit?: bigint
            is_frozen?: boolean
            name?: Binary
            symbol?: Binary
          }

          const [assetsAsset, assetsMetadata] = await Promise.all([
            chainConnector
              .send(chainId, "state_getStorage", [assetStateKey])
              .then((result) => (assetCoder.value.dec(result) as AssetResult | undefined) ?? null),
            chainConnector
              .send(chainId, "state_getStorage", [metadataStateKey])
              .then(
                (result) => (metadataCoder.value.dec(result) as MetadataResult | undefined) ?? null,
              ),
          ])

          const existentialDeposit = assetsAsset?.min_balance?.toString?.() ?? "0"
          const symbol = assetsMetadata?.symbol?.asText?.() ?? "Unit"
          const decimals = assetsMetadata?.decimals ?? 0
          const isFrozen = assetsMetadata?.is_frozen ?? false

          const id = subAssetTokenId(chainId, assetId)
          const token: SubAssetsToken = {
            id,
            type: "substrate-assets",
            platform: "polkadot",
            isDefault: tokenConfig?.isDefault ?? true,
            symbol,
            name: tokenConfig?.name || symbol,
            decimals,
            logo: tokenConfig?.logo,
            existentialDeposit,
            assetId,
            isFrozen,
            networkId: chainId,
          }

          if (tokenConfig?.symbol) {
            token.symbol = tokenConfig?.symbol
            token.id = subAssetTokenId(chainId, assetId)
          }
          if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
          if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

          tokens[token.id] = token
        } catch (error) {
          log.error(
            `Failed to build substrate-assets token ${tokenConfig.assetId} (${tokenConfig.symbol}) on ${chainId}`,
            error,
          )
          continue
        }
      }

      return tokens
    },

    // TODO: Don't create empty subscriptions
    async subscribeBalances({ addressesByToken }, callback) {
      const byNetwork = keys(addressesByToken).reduce(
        (acc, tokenId) => {
          const networkId = parseSubAssetTokenId(tokenId).networkId
          if (!acc[networkId]) acc[networkId] = {}
          acc[networkId][tokenId] = addressesByToken[tokenId]

          return acc
        },
        {} as Record<DotNetworkId, AddressesByToken<SubAssetsToken>>,
      )

      const controller = new AbortController()

      const pUnsubs = Promise.all(
        toPairs(byNetwork).map(async ([networkId, addressesByToken]) => {
          try {
            const queries = await buildNetworkQueries(
              networkId,
              chainConnector,
              chaindataProvider,
              addressesByToken,
              controller.signal,
            )
            if (controller.signal.aborted) return () => {}

            const stateHelper = new RpcStateQueryHelper(chainConnector, queries)

            return await stateHelper.subscribe((error, result) => {
              //  console.log("SubstrateAssetsModule.callback", { error, result })
              if (error) return callback(error)
              const balances = result?.filter((b): b is SubAssetsBalance => b !== null) ?? []
              if (balances.length > 0) callback(null, new Balances(balances))
            })
          } catch (err) {
            if (!controller.signal.aborted)
              log.error(`Failed to subscribe balances for network ${networkId}`, err)
            return () => {}
          }
        }),
      )

      return () => {
        controller.abort()
        pUnsubs.then((unsubs) => {
          unsubs.forEach((unsubscribe) => unsubscribe())
        })
      }
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const queries = await buildQueries(chainConnector, chaindataProvider, addressesByToken)
      const result = await new RpcStateQueryHelper(chainConnectors.substrate, queries).fetch()
      const balances = result?.filter((b): b is SubAssetsBalance => b !== null) ?? []
      return new Balances(balances)
    },

    async transferToken({
      tokenId,
      from,
      to,
      amount,

      registry,
      metadataRpc,
      blockHash,
      blockNumber,
      nonce,
      specVersion,
      transactionVersion,
      tip,
      transferMethod,
      userExtensions,
    }) {
      const token = await chaindataProvider.tokenById(tokenId)
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-assets")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.networkId
      const chain = await chaindataProvider.chainById(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const { genesisHash } = chain

      const id = token.assetId

      const pallet = "Assets"
      const method =
        // the assets pallet has no transfer_all method
        transferMethod === "transfer_all" ? "transfer" : transferMethod
      const args = { id, target: { Id: to }, amount }

      const unsigned = defineMethod(
        {
          method: {
            pallet: camelCase(pallet),
            name: camelCase(method),
            args,
          },
          address: from,
          blockHash,
          blockNumber,
          eraPeriod: 64,
          genesisHash,
          metadataRpc,
          nonce,
          specVersion,
          tip: tip ? Number(tip) : 0,
          transactionVersion,
        },
        { metadataRpc, registry, userExtensions },
      )

      return { type: "substrate", callData: unsigned.method }
    },
  }
}

async function buildNetworkQueries(
  networkId: DotNetworkId,
  chainConnector: ChainConnector,
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<SubAssetsToken>,
  signal?: AbortSignal,
): Promise<Array<RpcStateQuery<SubAssetsBalance | null>>> {
  const miniMetadata = await getMiniMetadata(
    chaindataProvider,
    chainConnector,
    networkId,
    moduleType,
    signal,
  )
  // console.log("Fetched miniMetadata for network", networkId, { miniMetadata })
  const chain = await chaindataProvider.chainById(networkId)
  const tokensById = await chaindataProvider.tokensById()

  signal?.throwIfAborted()

  const networkStorageCoders = buildNetworkStorageCoders(networkId, miniMetadata, {
    storage: ["Assets", "Account"],
  })

  return Object.entries(addressesByToken).flatMap(([tokenId, addresses]) => {
    const token = tokensById[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      return []
    }
    if (token.type !== "substrate-assets") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      return []
    }
    //
    if (!chain) {
      log.warn(`Chain ${networkId} for token ${tokenId} not found`)
      return []
    }

    return addresses.flatMap((address): RpcStateQuery<SubAssetsBalance | null> | [] => {
      const scaleCoder = networkStorageCoders?.storage
      const stateKey =
        tryEncode(scaleCoder, BigInt(token.assetId), address) ??
        tryEncode(scaleCoder, Number(token.assetId), address)
      if (!stateKey) {
        log.warn(
          `Invalid assetId / address in ${networkId} storage query ${token.assetId} / ${address}`,
        )
        return []
      }

      const decodeResult = (change: string | null) => {
        /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
        type DecodedType = {
          balance?: bigint
          is_frozen?: boolean
          reason?: { type?: "Sufficient" }
          status?: { type?: "Liquid" } | { type?: "Frozen" }
          extra?: undefined
        }

        const decoded = decodeScale<DecodedType>(
          scaleCoder,
          change,
          `Failed to decode substrate-assets balance on chain ${networkId}`,
        ) ?? {
          balance: 0n,
          is_frozen: false,
          reason: { type: "Sufficient" },
          status: { type: "Liquid" },
          extra: undefined,
        }

        const isFrozen = decoded?.status?.type === "Frozen"
        const amount = (decoded?.balance ?? 0n).toString()

        // due to the following balance calculations, which are made in the `Balance` type:
        //
        // total balance        = (free balance) + (reserved balance)
        // transferable balance = (free balance) - (frozen balance)
        //
        // when `isFrozen` is true we need to set **both** the `free` and `frozen` amounts
        // of this balance to the value we received from the RPC.
        //
        // if we only set the `frozen` amount, then the `total` calculation will be incorrect!
        const free = amount
        const frozen = token.isFrozen || isFrozen ? amount : "0"

        // include balance values even if zero, so that newly-zero values overwrite old values
        const balanceValues: Array<AmountWithLabel<string>> = [
          { type: "free", label: "free", amount: free.toString() },
          { type: "locked", label: "frozen", amount: frozen.toString() },
        ]

        return {
          source: "substrate-assets",

          status: "live",

          address,
          networkId,
          tokenId: token.id,
          values: balanceValues,
        } as SubAssetsBalance
      }

      return { chainId: networkId, stateKey, decodeResult }
    })
  })
}

async function buildQueries(
  chainConnector: ChainConnector,
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<SubAssetsToken>,
  signal?: AbortSignal,
): Promise<Array<RpcStateQuery<SubAssetsBalance | null>>> {
  const byNetwork = keys(addressesByToken).reduce(
    (acc, tokenId) => {
      const networkId = parseSubAssetTokenId(tokenId).networkId
      if (!acc[networkId]) acc[networkId] = {}
      acc[networkId][tokenId] = addressesByToken[tokenId]
      return acc
    },
    {} as Record<DotNetworkId, AddressesByToken<SubAssetsToken>>,
  )

  return (
    await Promise.all(
      toPairs(byNetwork).map(([networkId, addressesByToken]) => {
        return buildNetworkQueries(
          networkId,
          chainConnector,
          chaindataProvider,
          addressesByToken,
          signal,
        )
      }),
    )
  ).flat()
}

type ScaleStorageCoder = ReturnType<ReturnType<typeof getDynamicBuilder>["buildStorage"]>

// NOTE: Different chains need different formats for assetId when encoding the stateKey
// E.g. Polkadot Asset Hub needs it to be a string, Astar needs it to be a bigint
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tryEncode = (scaleCoder: ScaleStorageCoder | undefined, ...args: any[]) => {
  try {
    return scaleCoder?.keys?.enc?.(...args)
  } catch {
    return null
  }
}
