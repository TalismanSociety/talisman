import { TypeRegistry } from "@polkadot/types"
import { AbstractInt } from "@polkadot/types-codec"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { assert } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
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
} from "@talismn/scale"
import { isBigInt } from "@talismn/util"
import camelCase from "lodash/camelCase"

import { DefaultBalanceModule, NewBalanceModule, NewTransferParamsType } from "../BalanceModule"
import log from "../log"
import { db as balancesDb } from "../TalismanBalancesDatabase"
import { AddressesByToken, Balances, NewBalanceType } from "../types"
import { buildStorageCoders, getUniqueChainIds, RpcStateQuery, RpcStateQueryHelper } from "./util"

type ModuleType = "substrate-equilibrium"
const moduleType: ModuleType = "substrate-equilibrium"

export type SubEquilibriumToken = Extract<Token, { type: ModuleType }>

export const subEquilibriumTokenId = (chainId: ChainId, tokenSymbol: string) =>
  `${chainId}-substrate-equilibrium-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

export type SubEquilibriumChainMeta = {
  isTestnet: boolean
  miniMetadata?: string
  metadataVersion?: number
}

export type SubEquilibriumModuleConfig = {
  disable?: boolean
  tokens?: Array<
    {
      assetId?: string
    } & BalancesConfigTokenParams
  >
}

export type SubEquilibriumBalance = NewBalanceType<ModuleType, "simple", "substrate">

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "substrate-equilibrium": SubEquilibriumBalance
  }
}

export type SubEquilibriumTransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  userExtensions?: ExtDef
}>

export const SubEquilibriumModule: NewBalanceModule<
  ModuleType,
  SubEquilibriumToken,
  SubEquilibriumChainMeta,
  SubEquilibriumModuleConfig,
  SubEquilibriumTransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")

  return {
    ...DefaultBalanceModule(moduleType),

    async fetchSubstrateChainMeta(chainId, moduleConfig, metadataRpc) {
      const isTestnet = (await chaindataProvider.chainById(chainId))?.isTestnet || false
      if (metadataRpc === undefined) return { isTestnet }
      if (moduleConfig?.disable !== false) return { isTestnet } // default to disabled

      const { metadataVersion, metadata, tag } = decodeMetadata(metadataRpc)
      if (!metadata) return { isTestnet }

      compactMetadata(metadata, [
        { pallet: "EqAssets", items: ["Assets"] },
        { pallet: "System", items: ["Account"] },
      ])

      const miniMetadata = encodeMetadata(tag === "v15" ? { tag, metadata } : { tag, metadata })

      return { isTestnet, miniMetadata, metadataVersion }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      // default to disabled
      if (moduleConfig?.disable !== false) return {}

      const { isTestnet, miniMetadata, metadataVersion } = chainMeta
      if (miniMetadata === undefined || metadataVersion === undefined) return {}
      if (metadataVersion < 14) return {}

      const { metadata } = decodeMetadata(miniMetadata)
      if (metadata === undefined) return {}

      try {
        const scaleBuilder = getDynamicBuilder(getLookupFn(metadata))
        const assetsCoder = scaleBuilder.buildStorage("EqAssets", "Assets")
        const stateKey = assetsCoder.enc()

        /** NOTE: Just a guideline, the RPC can return whatever it wants */
        type AssetsResult = Array<
          Partial<{
            id: bigint
            lot: bigint
            price_step: bigint
            maker_fee: number
            taker_fee: number
            asset_xcm_data: unknown
            debt_weight: number
            lending_debt_weight: number
            buyout_priority: bigint
            asset_type: unknown
            is_dex_enabled: boolean
            collateral_discount: number
          }>
        >

        const assetsResult = await chainConnector
          .send(chainId, "state_getStorage", [stateKey])
          .then((result) => (assetsCoder.dec(result) as AssetsResult | undefined) ?? null)

        const tokens = (Array.isArray(assetsResult) ? assetsResult : []).flatMap((asset) => {
          if (!asset) return []
          if (!asset?.id) return []

          const assetId = asset.id.toString(10)
          const symbol = tokenSymbolFromU64Id(asset.id)
          const id = subEquilibriumTokenId(chainId, symbol)
          const decimals = DEFAULT_DECIMALS

          const tokenConfig = (moduleConfig?.tokens ?? []).find(
            (token) => token.assetId === assetId,
          )

          const token: SubEquilibriumToken = {
            id,
            type: "substrate-equilibrium",
            isTestnet,
            isDefault: tokenConfig?.isDefault ?? true,
            symbol,
            decimals,
            logo: tokenConfig?.logo || githubTokenLogoUrl(id),
            // TODO: Fetch the ED
            existentialDeposit: "0",
            assetId,
            chain: { id: chainId },
          }

          if (tokenConfig?.symbol) {
            token.symbol = tokenConfig?.symbol
            token.id = subEquilibriumTokenId(chainId, token.symbol)
          }
          if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
          if (tokenConfig?.dcentName) token.dcentName = tokenConfig?.dcentName
          if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

          return [[token.id, token]]
        })

        return Object.fromEntries(tokens)
      } catch (error) {
        log.error(
          `Failed to build substrate-equilibrium tokens on ${chainId}`,
          (error as Error)?.message ?? error,
        )
        return {}
      }
    },

    // TODO: Don't create empty subscriptions
    async subscribeBalances({ addressesByToken }, callback) {
      const queries = await buildQueries(chaindataProvider, addressesByToken)
      const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
        (error, result) => {
          if (error) return callback(error)
          const balances = result?.flatMap((balances) => balances) ?? []
          if (balances.length > 0) callback(null, new Balances(balances))
        },
      )

      return unsubscribe
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const queries = await buildQueries(chaindataProvider, addressesByToken)
      const result = await new RpcStateQueryHelper(chainConnectors.substrate, queries).fetch()
      const balances = result?.flatMap((balances) => balances) ?? []
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

      if (token.type !== "substrate-equilibrium")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.chainById(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const { genesisHash } = chain

      const { assetId } = token

      const pallet = "EqBalances"
      const method =
        transferMethod === "transfer_all"
          ? // the eqBalances pallet has no transfer_all method
            "transfer"
          : transferMethod === "transfer_keep_alive"
            ? // the eqBalances pallet has no transfer_keep_alive method
              "transfer"
            : "transfer"
      const args = { asset: assetId, to, value: amount }

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

async function buildQueries(
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<SubEquilibriumToken>,
): Promise<Array<RpcStateQuery<SubEquilibriumBalance[]>>> {
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
    moduleType: "substrate-equilibrium",
    coders: { storage: ["System", "Account"] },
  })

  // equilibrium returns all chain tokens for each address in the one query
  // so, we only need to make one query per address, rather than one query per token per address
  const addressesByChain = new Map<string, Set<string>>()
  const tokensByAddress = new Map<string, Set<SubEquilibriumToken>>()
  Object.entries(addressesByToken).map(([tokenId, addresses]) => {
    const token = tokens[tokenId]
    if (!token) return log.warn(`Token ${tokenId} not found`)
    if (token.type !== "substrate-equilibrium")
      return log.debug(`This module doesn't handle tokens of type ${token.type}`)

    const chainId: string | undefined = token?.chain?.id
    if (!chainId) return log.warn(`Token ${tokenId} has no chain`)

    const byChain = addressesByChain.get(chainId) ?? new Set()
    addresses.forEach((address) => {
      byChain?.add(address)
      tokensByAddress.set(address, (tokensByAddress.get(address) ?? new Set()).add(token))
    })
    addressesByChain.set(chainId, byChain)
  })

  return Array.from(addressesByChain).flatMap(([chainId, addresses]) => {
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} not found`)
      return []
    }

    return Array.from(addresses).flatMap((address): RpcStateQuery<SubEquilibriumBalance[]> | [] => {
      const scaleCoder = chainStorageCoders.get(chainId)?.storage
      const stateKey = encodeStateKey(
        scaleCoder,
        `Invalid address in ${chainId} storage query ${address}`,
        address,
      )
      if (!stateKey) return []

      const decodeResult = (change: string | null) => {
        /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
        type DecodedType = {
          consumers?: number
          nonce?: number
          providers?: number
          sufficients?: number
          data?: {
            type?: string
            value?: {
              balance?: Array<
                [
                  bigint,
                  { type?: "Positive"; value?: bigint } | { type?: "Negative"; value?: bigint },
                ]
              >
              lock?: bigint
            }
          }
        }

        const decoded = decodeScale<DecodedType>(
          scaleCoder,
          change,
          `Failed to decode eqBalances on chain ${chainId}`,
        )

        const tokenBalances = Object.fromEntries(
          (decoded?.data?.value?.balance ?? [])
            .map((balance) => ({
              id: (balance?.[0] ?? 0n)?.toString?.(),
              free:
                balance?.[1]?.type === "Positive"
                  ? (balance?.[1]?.value ?? 0n).toString()
                  : balance?.[1]?.type === "Negative"
                    ? ((balance?.[1]?.value ?? 0n) * -1n).toString()
                    : "0",
            }))
            .map(
              ({
                id,
                free,
              }: {
                id?: string
                free?: string
              }): [string | undefined, string | undefined] => [id, free],
            )
            .filter(([id, free]) => id !== undefined && free !== undefined),
        )

        const result = Array.from(tokensByAddress.get(address) ?? [])
          .filter((t) => t.chain.id === chainId)
          .map((token) => {
            const value = tokenBalances[token.assetId]
            return {
              source: "substrate-equilibrium",
              status: "live",
              address,
              multiChainId: { subChainId: chainId },
              chainId,
              tokenId: token.id,
              value,
            } as SubEquilibriumBalance
          })
          .filter((b): b is SubEquilibriumBalance => b !== undefined)

        return result
      }

      return { chainId, stateKey, decodeResult }
    })
  })
}

const DEFAULT_DECIMALS = 9

const tokenSymbolFromU64Id = (u64: number | bigint | AbstractInt) => {
  const bytes = []
  let num = typeof u64 === "number" ? BigInt(u64) : isBigInt(u64) ? u64 : u64.toBigInt()
  do {
    bytes.unshift(Number(num % 256n))
    num = num / 256n
  } while (num > 0)
  return new TextDecoder("utf-8").decode(new Uint8Array(bytes)).toUpperCase()
}
