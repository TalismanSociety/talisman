import { mergeUint8, toHex } from "@polkadot-api/utils"
import { TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { assert } from "@polkadot/util"
import {
  BalancesConfigTokenParams,
  ChaindataProvider,
  ChainId,
  githubTokenLogoUrl,
  Token,
} from "@talismn/chaindata-provider"
import {
  compactMetadata,
  decodeMetadata,
  decodeScale,
  encodeMetadata,
  encodeStateKey,
  getDynamicBuilder,
  getLookupFn,
  papiParse,
} from "@talismn/scale"
import { Binary } from "polkadot-api"

import { DefaultBalanceModule, NewBalanceModule, NewTransferParamsType } from "../BalanceModule"
import log from "../log"
import { db as balancesDb } from "../TalismanBalancesDatabase"
import { AddressesByToken, AmountWithLabel, Balances, NewBalanceType } from "../types"
import { buildStorageCoders, getUniqueChainIds, RpcStateQuery, RpcStateQueryHelper } from "./util"

type ModuleType = "substrate-foreignassets"
const moduleType: ModuleType = "substrate-foreignassets"

export type SubForeignAssetsToken = Extract<Token, { type: ModuleType }>

export const subForeignAssetTokenId = (chainId: ChainId, tokenSymbol: string) =>
  `${chainId}-substrate-foreignassets-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

export type SubForeignAssetsChainMeta = {
  isTestnet: boolean
  miniMetadata?: string
  metadataVersion?: number
}

export type SubForeignAssetsModuleConfig = {
  tokens?: Array<
    {
      onChainId: string
    } & BalancesConfigTokenParams
  >
}

export type SubForeignAssetsBalance = NewBalanceType<ModuleType, "complex", "substrate">

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "substrate-foreignassets": SubForeignAssetsBalance
  }
}

export type SubForeignAssetsTransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  userExtensions?: ExtDef
}>

export const SubForeignAssetsModule: NewBalanceModule<
  ModuleType,
  SubForeignAssetsToken,
  SubForeignAssetsChainMeta,
  SubForeignAssetsModuleConfig,
  SubForeignAssetsTransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")

  return {
    ...DefaultBalanceModule(moduleType),

    async fetchSubstrateChainMeta(chainId, moduleConfig, metadataRpc) {
      const isTestnet = (await chaindataProvider.chainById(chainId))?.isTestnet || false
      if (metadataRpc === undefined) return { isTestnet }
      if ((moduleConfig?.tokens ?? []).length < 1) return { isTestnet }

      const { metadataVersion, metadata, tag } = decodeMetadata(metadataRpc)
      if (!metadata) return { isTestnet }

      compactMetadata(metadata, [
        { pallet: "ForeignAssets", items: ["Account", "Asset", "Metadata"] },
      ])

      const miniMetadata = encodeMetadata(tag === "v15" ? { tag, metadata } : { tag, metadata })

      return { isTestnet, miniMetadata, metadataVersion }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      if ((moduleConfig?.tokens ?? []).length < 1) return {}

      const { isTestnet, miniMetadata, metadataVersion } = chainMeta
      if (miniMetadata === undefined || metadataVersion === undefined) return {}
      if (metadataVersion < 14) return {}

      const { metadata } = decodeMetadata(miniMetadata)
      if (metadata === undefined) return {}

      const scaleBuilder = getDynamicBuilder(getLookupFn(metadata))
      const assetCoder = scaleBuilder.buildStorage("ForeignAssets", "Asset")
      const metadataCoder = scaleBuilder.buildStorage("ForeignAssets", "Metadata")

      const tokens: Record<string, SubForeignAssetsToken> = {}
      for (const tokenConfig of moduleConfig?.tokens ?? []) {
        try {
          const onChainId = (() => {
            try {
              return papiParse(tokenConfig.onChainId)
            } catch (error) {
              return tokenConfig.onChainId
            }
          })()

          if (onChainId === undefined) continue

          const assetStateKey = assetCoder.enc(onChainId)
          const metadataStateKey = metadataCoder.enc(onChainId)

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
              .then((result) => (assetCoder.dec(result) as AssetResult | undefined) ?? null),
            chainConnector
              .send(chainId, "state_getStorage", [metadataStateKey])
              .then((result) => (metadataCoder.dec(result) as MetadataResult | undefined) ?? null),
          ])

          const existentialDeposit = assetsAsset?.min_balance?.toString?.() ?? "0"
          const symbol = assetsMetadata?.symbol?.asText?.() ?? "Unit"
          const decimals = assetsMetadata?.decimals ?? 0
          const isFrozen = assetsMetadata?.is_frozen ?? false

          const id = subForeignAssetTokenId(chainId, symbol)
          const token: SubForeignAssetsToken = {
            id,
            type: "substrate-foreignassets",
            isTestnet,
            isDefault: tokenConfig?.isDefault ?? true,
            symbol,
            decimals,
            logo: tokenConfig?.logo || githubTokenLogoUrl(id),
            existentialDeposit,
            onChainId: tokenConfig.onChainId,
            isFrozen,
            chain: { id: chainId },
          }

          if (tokenConfig?.symbol) {
            token.symbol = tokenConfig?.symbol
            token.id = subForeignAssetTokenId(chainId, token.symbol)
          }
          if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
          if (tokenConfig?.dcentName) token.dcentName = tokenConfig?.dcentName
          if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

          tokens[token.id] = token
        } catch (error) {
          log.error(
            `Failed to build substrate-foreignassets token ${tokenConfig.onChainId} (${tokenConfig.symbol}) on ${chainId}`,
            (error as Error)?.message ?? error,
          )
          continue
        }
      }

      return tokens
    },

    // TODO: Don't create empty subscriptions
    async subscribeBalances({ addressesByToken }, callback) {
      const queries = await buildQueries(chaindataProvider, addressesByToken)
      const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
        (error, result) => {
          if (error) return callback(error)
          const balances = result?.filter((b): b is SubForeignAssetsBalance => b !== null) ?? []
          if (balances.length > 0) callback(null, new Balances(balances))
        },
      )

      return unsubscribe
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const queries = await buildQueries(chaindataProvider, addressesByToken)
      const result = await new RpcStateQueryHelper(chainConnectors.substrate, queries).fetch()
      const balances = result?.filter((b): b is SubForeignAssetsBalance => b !== null) ?? []
      return new Balances(balances)
    },

    async transferToken({ tokenId, to, amount, transferMethod, metadataRpc }) {
      const token = await chaindataProvider.tokenById(tokenId)
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-foreignassets")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.chainById(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const onChainId = (() => {
        try {
          return papiParse(token.onChainId)
        } catch (error) {
          return token.onChainId
        }
      })()

      const pallet = "ForeignAssets"
      // the ForeignAssets pallet has no transfer_all method
      const method = transferMethod === "transfer_all" ? "transfer" : transferMethod
      const args = {
        id: onChainId,
        target: { type: "Id", value: to },
        amount: BigInt(amount),
      }

      const { metadata } = decodeMetadata(metadataRpc)
      if (metadata === undefined) throw new Error("Unable to decode metadata")

      const scaleBuilder = getDynamicBuilder(getLookupFn(metadata))
      try {
        const { location, codec } = scaleBuilder.buildCall(pallet, method)
        const callData = Binary.fromBytes(mergeUint8(new Uint8Array(location), codec.enc(args)))

        return { type: "substrate", callData: toHex(callData.asBytes()) }
      } catch (cause) {
        throw new Error(`Failed to build ${moduleType} transfer tx`, { cause })
      }
    },
  }
}

async function buildQueries(
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<SubForeignAssetsToken>,
): Promise<Array<RpcStateQuery<SubForeignAssetsBalance | null>>> {
  const allChains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()
  const miniMetadatas = new Map(
    (await balancesDb.miniMetadatas.toArray()).map((miniMetadata) => [
      miniMetadata.id,
      miniMetadata,
    ]),
  )

  const uniqueChainIds = getUniqueChainIds(addressesByToken, tokens)
  const chains = Object.fromEntries(uniqueChainIds.map((chainId) => [chainId, allChains[chainId]]))
  const chainStorageCoders = buildStorageCoders({
    chainIds: uniqueChainIds,
    chains,
    miniMetadatas,
    moduleType: "substrate-foreignassets",
    coders: { storage: ["ForeignAssets", "Account"] },
  })

  return Object.entries(addressesByToken).flatMap(([tokenId, addresses]) => {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      return []
    }
    if (token.type !== "substrate-foreignassets") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      return []
    }
    const chainId = token.chain?.id
    if (!chainId) {
      log.warn(`Token ${tokenId} has no chain`)
      return []
    }
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      return []
    }

    return addresses.flatMap((address): RpcStateQuery<SubForeignAssetsBalance | null> | [] => {
      const scaleCoder = chainStorageCoders.get(chainId)?.storage
      const onChainId = (() => {
        try {
          return papiParse(token.onChainId)
        } catch (error) {
          return token.onChainId
        }
      })()

      const stateKey = encodeStateKey(
        scaleCoder,
        `Invalid address / token onChainId in ${chainId} storage query ${address} / ${token.onChainId}`,
        onChainId,
        address,
      )
      if (!stateKey) return []

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
          `Failed to decode substrate-foreignassets balance on chain ${chainId}`,
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
          source: "substrate-foreignassets",

          status: "live",

          address,
          multiChainId: { subChainId: chainId },
          chainId,
          tokenId: token.id,
          values: balanceValues,
        } as SubForeignAssetsBalance
      }

      return { chainId, stateKey, decodeResult }
    })
  })
}
