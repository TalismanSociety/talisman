import { Metadata, TypeRegistry } from "@polkadot/types"
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
  $metadataV14,
  filterMetadataPalletsAndItems,
  getMetadataVersion,
  PalletMV14,
  StorageEntryMV14,
} from "@talismn/scale"
import * as $ from "@talismn/subshape-fork"
import { decodeAnyAddress, isBigInt } from "@talismn/util"

import { DefaultBalanceModule, NewBalanceModule, NewTransferParamsType } from "../BalanceModule"
import log from "../log"
import { db as balancesDb } from "../TalismanBalancesDatabase"
import { AddressesByToken, Balances, NewBalanceType } from "../types"
import {
  buildStorageDecoders,
  createTypeRegistryCache,
  findChainMeta,
  GetOrCreateTypeRegistry,
  getUniqueChainIds,
  RpcStateQuery,
  RpcStateQueryHelper,
  StorageHelper,
} from "./util"

type ModuleType = "substrate-equilibrium"
const moduleType: ModuleType = "substrate-equilibrium"

export type SubEquilibriumToken = Extract<Token, { type: ModuleType }>

const subEquilibriumTokenId = (chainId: ChainId, tokenSymbol: string) =>
  `${chainId}-substrate-equilibrium-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

export type SubEquilibriumChainMeta = {
  isTestnet: boolean
  miniMetadata: `0x${string}` | null
  metadataVersion: number
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
  metadataRpc: `0x${string}`
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  transferMethod: "transfer" | "transferKeepAlive" | "transferAll"
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

  const { getOrCreateTypeRegistry } = createTypeRegistryCache()

  return {
    ...DefaultBalanceModule(moduleType),

    async fetchSubstrateChainMeta(chainId, moduleConfig, metadataRpc) {
      const isTestnet = (await chaindataProvider.chainById(chainId))?.isTestnet || false
      if (metadataRpc === undefined) return { isTestnet, miniMetadata: null, metadataVersion: 0 }

      const metadataVersion = getMetadataVersion(metadataRpc)
      // default to disabled
      if (moduleConfig?.disable !== false) return { isTestnet, miniMetadata: null, metadataVersion }

      if (metadataVersion !== 14) return { isTestnet, miniMetadata: null, metadataVersion }

      const metadata = $metadataV14.decode($.decodeHex(metadataRpc))

      const isEqAssetsPallet = (pallet: PalletMV14) => pallet.name === "EqAssets"
      const isAssetsItem = (item: StorageEntryMV14) => item.name === "Assets"

      const isSystemPallet = (pallet: PalletMV14) => pallet.name === "System"
      const isAccountItem = (item: StorageEntryMV14) => item.name === "Account"

      // TODO: Handle metadata v15
      filterMetadataPalletsAndItems(metadata, [
        { pallet: isEqAssetsPallet, items: [isAssetsItem] },
        { pallet: isSystemPallet, items: [isAccountItem] },
      ])
      metadata.extrinsic.signedExtensions = []

      const miniMetadata = $.encodeHexPrefixed($metadataV14.encode(metadata)) as `0x${string}`

      return {
        isTestnet,
        miniMetadata,
        metadataVersion,
      }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      // default to disabled
      if (moduleConfig?.disable !== false) return {}

      const { isTestnet, miniMetadata: metadataRpc, metadataVersion } = chainMeta

      const registry = new TypeRegistry()
      if (metadataRpc !== null && metadataVersion >= 14)
        registry.setMetadata(new Metadata(registry, metadataRpc))

      const tokens: Record<string, SubEquilibriumToken> = {}

      try {
        const assetsQuery = new StorageHelper(registry, "eqAssets", "assets")

        const assetsResult = await chainConnector
          .send(chainId, "state_getStorage", [assetsQuery.stateKey])
          .then((result) => assetsQuery.decode(result))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;[...((assetsResult as any)?.value ?? [])].map((asset: any) => {
          if (!asset) return
          if (!asset?.id) return

          const assetId = asset.id.toString(10)
          const symbol = tokenSymbolFromU64Id(asset.id)
          const id = subEquilibriumTokenId(chainId, symbol)
          const decimals = DEFAULT_DECIMALS

          const tokenConfig = (moduleConfig?.tokens ?? []).find(
            (token) => token.assetId === assetId
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

          if (tokenConfig?.symbol) token.symbol = tokenConfig?.symbol
          if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
          if (tokenConfig?.dcentName) token.dcentName = tokenConfig?.dcentName
          if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

          tokens[token.id] = token
        })
      } catch (error) {
        log.error(
          `Failed to build substrate-equilibrium tokens on ${chainId}`,
          (error as Error)?.message ?? error
        )
      }

      return tokens
    },

    // TODO: Don't create empty subscriptions
    async subscribeBalances({ addressesByToken }, callback) {
      const queries = await buildQueries(
        chaindataProvider,
        getOrCreateTypeRegistry,
        addressesByToken
      )
      const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
        (error, result) =>
          error
            ? callback(error)
            : callback(null, new Balances(result?.flatMap((balances) => balances) ?? []))
      )

      return unsubscribe
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const queries = await buildQueries(
        chaindataProvider,
        getOrCreateTypeRegistry,
        addressesByToken
      )
      const result = await new RpcStateQueryHelper(chainConnectors.substrate, queries).fetch()

      return new Balances(result.flatMap((balances) => balances) ?? [])
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

      const pallet = "eqBalances"
      const method =
        transferMethod === "transferAll"
          ? // the eqBalances pallet has no transferAll method
            "transfer"
          : transferMethod === "transferKeepAlive"
          ? // the eqBalances pallet has no transferKeepAlive method
            "transfer"
          : "transfer"
      const args = { asset: assetId, to, value: amount }

      const unsigned = defineMethod(
        {
          method: {
            pallet,
            name: method,
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
        { metadataRpc, registry, userExtensions }
      )

      return { type: "substrate", tx: unsigned }
    },
  }
}

async function buildQueries(
  chaindataProvider: ChaindataProvider,
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubEquilibriumToken>
): Promise<Array<RpcStateQuery<SubEquilibriumBalance[]>>> {
  const allChains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()
  const miniMetadatas = new Map(
    (await balancesDb.miniMetadatas.toArray()).map((miniMetadata) => [
      miniMetadata.id,
      miniMetadata,
    ])
  )

  const uniqueChainIds = getUniqueChainIds(addressesByToken, tokens)
  const chains = Object.fromEntries(uniqueChainIds.map((chainId) => [chainId, allChains[chainId]]))
  const chainStorageDecoders = buildStorageDecoders({
    chains,
    miniMetadatas,
    moduleType: "substrate-equilibrium",
    decoders: { storageDecoder: ["system", "account"] },
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

    const [chainMeta] = findChainMeta<typeof SubEquilibriumModule>(
      miniMetadatas,
      "substrate-equilibrium",
      chain
    )
    const registry =
      chainMeta?.miniMetadata !== undefined &&
      chainMeta?.miniMetadata !== null &&
      chainMeta?.metadataVersion >= 14
        ? getOrCreateTypeRegistry(chainId, chainMeta.miniMetadata)
        : new TypeRegistry()

    return Array.from(addresses).flatMap((address): RpcStateQuery<SubEquilibriumBalance[]> | [] => {
      const storageHelper = new StorageHelper(
        registry,
        "system",
        "account",
        decodeAnyAddress(address)
      )
      const stateKey = storageHelper.stateKey
      const storageDecoder = chainStorageDecoders.get(chainId)?.storageDecoder
      if (!stateKey) return []
      const decodeResult = (change: string | null) => {
        // e.g.
        // {
        //   nonce: 5
        //   consumers: 0
        //   providers: 2
        //   sufficients: 0
        //   data: {
        //     V0: {
        //       lock: 0
        //       balance: [
        //         [
        //           25,969
        //           {
        //             Positive: 499,912,656,271
        //           }
        //         ]
        //         [
        //           6,582,132
        //           {
        //             Positive: 1,973,490,154
        //           }
        //         ]
        //         [
        //           6,648,164
        //           {
        //             Positive: 200,000,000
        //           }
        //         ]
        //         [
        //           435,694,104,436
        //           {
        //             Positive: 828,313,918
        //           }
        //         ]
        //       ]
        //     }
        //   }
        // }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const balances: any =
          storageDecoder && change !== null ? storageDecoder.decode($.decodeHex(change)) : null

        const tokenBalances = Object.fromEntries(
          (balances?.data?.balance ?? [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((balance: any) => ({
              id: (balance?.[0] ?? 0n)?.toString?.(),
              free:
                balance?.[1]?.type === "Positive"
                  ? (balance?.[1]?.value ?? 0n).toString()
                  : balance?.[1]?.type === "Negative"
                  ? ((balance?.[1]?.value ?? 0n) * -1n).toString()
                  : "0",
            }))
            .map(({ id, free }: { id?: string; free?: string }) => [id, free])
            .filter(
              ([id, free]: [string | undefined, string | undefined]) =>
                id !== undefined && free !== undefined
            )
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
