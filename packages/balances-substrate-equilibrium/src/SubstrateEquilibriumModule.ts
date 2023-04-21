import { Metadata, TypeRegistry } from "@polkadot/types"
import { AbstractInt } from "@polkadot/types-codec"
import { assert } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
import {
  AddressesByToken,
  Amount,
  Balance,
  Balances,
  DefaultBalanceModule,
  GetOrCreateTypeRegistry,
  NewBalanceModule,
  NewBalanceType,
  NewTransferParamsType,
  RpcStateQuery,
  RpcStateQueryHelper,
  StorageHelper,
  createTypeRegistryCache,
  findChainMeta,
} from "@talismn/balances"
import {
  ChainId,
  ChaindataProvider,
  NewTokenType,
  SubChainId,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import {
  filterMetadataPalletsAndItems,
  metadataIsV14,
  mutateMetadata,
} from "@talismn/mutate-metadata"
import { decodeAnyAddress } from "@talismn/util"

import log from "./log"

type ModuleType = "substrate-equilibrium"

const subEquilibriumTokenId = (chainId: ChainId, tokenSymbol: string) =>
  `${chainId}-substrate-equilibrium-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

export type SubEquilibriumToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    assetId: string
    chain: { id: ChainId }
  }
>

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    SubEquilibriumToken: SubEquilibriumToken
  }
}

export type SubEquilibriumChainMeta = {
  isTestnet: boolean
  metadata: `0x${string}` | null
  metadataVersion: number
}

export type SubEquilibriumModuleConfig = {
  disable?: boolean
}

export type SubEquilibriumBalance = NewBalanceType<
  ModuleType,
  {
    multiChainId: SubChainId

    free: Amount
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    SubEquilibriumBalance: SubEquilibriumBalance
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
    ...DefaultBalanceModule("substrate-equilibrium"),

    async fetchSubstrateChainMeta(chainId, moduleConfig) {
      const isTestnet = (await chaindataProvider.getChain(chainId))?.isTestnet || false

      // default to disabled
      if (moduleConfig?.disable !== false) return { isTestnet, metadata: null, metadataVersion: 0 }

      const metadataRpc = await chainConnector.send(chainId, "state_getMetadata", [])

      const pjsMetadata: Metadata = new Metadata(new TypeRegistry(), metadataRpc)
      pjsMetadata.registry.setMetadata(pjsMetadata)

      const metadata = await mutateMetadata(metadataRpc, (metadata) => {
        // we can't parse metadata < v14
        //
        // as of v14 the type information required to interact with a chain is included in the chain metadata
        // https://github.com/paritytech/substrate/pull/8615
        //
        // before this change, the client needed to already know the type information ahead of time
        if (!metadataIsV14(metadata)) return null

        const isEqAssetsPallet = (pallet: { name: string }) => pallet.name === "EqAssets"
        const isAssetsItem = (item: { name: string }) => item.name === "Assets"

        const isSystemPallet = (pallet: { name: string }) => pallet.name === "System"
        const isAccountItem = (item: { name: string }) => item.name === "Account"

        filterMetadataPalletsAndItems(metadata, [
          { pallet: isEqAssetsPallet, items: [isAssetsItem] },
          { pallet: isSystemPallet, items: [isAccountItem] },
        ])

        // ditch the chain's signedExtensions, we don't need them for balance lookups
        // and the polkadot.js TypeRegistry will complain when it can't find the types for them
        metadata.value.extrinsic.signedExtensions = []

        return metadata
      })

      return {
        isTestnet,
        metadata,
        metadataVersion: pjsMetadata.version,
      }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      // default to disabled
      if (moduleConfig?.disable !== false) return {}

      const { isTestnet, metadata: metadataRpc, metadataVersion } = chainMeta

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

          const assetId = asset.id
          const symbol = tokenSymbolFromU64Id(assetId)
          const id = subEquilibriumTokenId(chainId, symbol)
          const decimals = DEFAULT_DECIMALS

          const token: SubEquilibriumToken = {
            id,
            type: "substrate-equilibrium",
            isTestnet,
            symbol,
            decimals,
            logo: githubTokenLogoUrl(id),
            // TODO: Fetch the ED
            existentialDeposit: "0",
            assetId: assetId.toString(10),
            chain: { id: chainId },
          }

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
    async subscribeBalances(addressesByToken, callback) {
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
    }) {
      const token = await chaindataProvider.getToken(tokenId)
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-equilibrium")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.getChain(chainId)
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
        { metadataRpc, registry }
      )

      return { type: "substrate", tx: unsigned }
    },
  }
}

async function buildQueries(
  chaindataProvider: ChaindataProvider,
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubEquilibriumToken>
): Promise<Array<RpcStateQuery<Balance[]>>> {
  const chains = await chaindataProvider.chains()
  const tokens = await chaindataProvider.tokens()

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

    const chainMeta = findChainMeta<typeof SubEquilibriumModule>("substrate-equilibrium", chain)
    const registry =
      chainMeta?.metadata !== undefined &&
      chainMeta?.metadata !== null &&
      chainMeta?.metadataVersion >= 14
        ? getOrCreateTypeRegistry(chainId, chainMeta.metadata)
        : new TypeRegistry()

    return Array.from(addresses).flatMap((address): RpcStateQuery<Balance[]> | [] => {
      const storageHelper = new StorageHelper(
        registry,
        "system",
        "account",
        decodeAnyAddress(address)
      )
      const stateKey = storageHelper.stateKey
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
        const balances: any = storageHelper.decode(change)

        const tokenBalances = Object.fromEntries(
          (balances?.data?.value?.balance || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((balance: any) => ({
              id: balance?.[0]?.toBigInt?.().toString?.(),
              free: balance?.[1]?.isPositive
                ? balance?.[1]?.asPositive?.toBigInt?.().toString()
                : balance?.[1]?.isNegative
                ? (balance?.[1]?.asNegative?.toBigInt?.() * -1n).toString()
                : "0",
            }))
            .map(({ id, free }: { id?: string; free?: string }) => [id, free])
        )

        return Array.from(tokensByAddress.get(address) ?? []).map((token) => {
          const free = tokenBalances[token.assetId] ?? "0"
          return new Balance({
            source: "substrate-equilibrium",

            status: "live",

            address,
            multiChainId: { subChainId: chainId },
            chainId,
            tokenId: token.id,

            free,
          })
        })
      }

      return { chainId, stateKey, decodeResult }
    })
  })
}

const DEFAULT_DECIMALS = 9

const tokenSymbolFromU64Id = (u64: number | bigint | AbstractInt) => {
  const bytes = []
  let num = typeof u64 === "number" ? BigInt(u64) : typeof u64 === "bigint" ? u64 : u64.toBigInt()
  do {
    bytes.unshift(Number(num % 256n))
    num = num / 256n
  } while (num > 0)
  return Buffer.from(bytes).toString("utf8").toUpperCase()
}
