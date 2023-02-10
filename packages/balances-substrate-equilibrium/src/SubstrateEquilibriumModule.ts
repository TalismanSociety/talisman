import { Metadata, TypeRegistry } from "@polkadot/types"
import { AbstractInt } from "@polkadot/types-codec"
import {
  AddressesByToken,
  Amount,
  Balance,
  BalanceModule,
  Balances,
  DefaultBalanceModule,
  NewBalanceType,
  StorageHelper,
} from "@talismn/balances"
import {
  ChainId,
  ChaindataProvider,
  NewTokenType,
  SubChainId,
  TokenList,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import { mutateMetadata } from "@talismn/mutate-metadata"
import { decodeAnyAddress, hasOwnProperty } from "@talismn/util"

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

export const SubEquilibriumModule: BalanceModule<
  ModuleType,
  SubEquilibriumToken,
  SubEquilibriumChainMeta,
  SubEquilibriumModuleConfig
> = {
  ...DefaultBalanceModule("substrate-equilibrium"),

  async fetchSubstrateChainMeta(chainConnector, chaindataProvider, chainId, moduleConfig) {
    const isTestnet = (await chaindataProvider.getChain(chainId))?.isTestnet || false

    // default to disabled
    if (moduleConfig?.disable !== false) return { isTestnet, metadata: null, metadataVersion: 0 }

    const metadataRpc = await chainConnector.send(chainId, "state_getMetadata", [])

    const pjsMetadata: Metadata = new Metadata(new TypeRegistry(), metadataRpc)
    pjsMetadata.registry.setMetadata(pjsMetadata)

    const metadata = await mutateMetadata(metadataRpc, (metadata) => {
      if (
        metadata.__kind === "V0" ||
        metadata.__kind === "V1" ||
        metadata.__kind === "V2" ||
        metadata.__kind === "V3" ||
        metadata.__kind === "V4" ||
        metadata.__kind === "V5" ||
        metadata.__kind === "V6" ||
        metadata.__kind === "V7" ||
        metadata.__kind === "V8" ||
        metadata.__kind === "V9" ||
        metadata.__kind === "V10" ||
        metadata.__kind === "V11" ||
        metadata.__kind === "V12" ||
        metadata.__kind === "V13"
      ) {
        // we can't parse metadata < v14
        //
        // as of v14 the type information required to interact with a chain is included in the chain metadata
        // https://github.com/paritytech/substrate/pull/8615
        //
        // before this change, the client needed to already know the type information ahead of time
        return null
      }

      const isEqAssetsPallet = (pallet: any) => pallet.name === "EqAssets"
      const isAssetsItem = (item: any) => item.name === "Assets"

      const isSystemPallet = (pallet: any) => pallet.name === "System"
      const isAccountItem = (item: any) => item.name === "Account"

      const isSystemOrEqAssetsPallet = (pallet: any) =>
        isEqAssetsPallet(pallet) || isSystemPallet(pallet)

      metadata.value.pallets = metadata.value.pallets.filter(isSystemOrEqAssetsPallet)

      const [assetsItem, accountItem] = (() => {
        const eqAssetsPallet = metadata.value.pallets.find(isEqAssetsPallet)
        const systemPallet = metadata.value.pallets.find(isSystemPallet)
        if (!eqAssetsPallet || !systemPallet) return []
        if (!eqAssetsPallet.storage || !systemPallet.storage) return []

        eqAssetsPallet.events = undefined
        eqAssetsPallet.calls = undefined
        eqAssetsPallet.errors = undefined
        eqAssetsPallet.constants = []
        eqAssetsPallet.storage.items = eqAssetsPallet.storage.items.filter(isAssetsItem)

        systemPallet.events = undefined
        systemPallet.calls = undefined
        systemPallet.errors = undefined
        systemPallet.constants = []
        systemPallet.storage.items = systemPallet.storage.items.filter(isAccountItem)

        return [
          (eqAssetsPallet.storage?.items || []).find(isAssetsItem),
          (systemPallet.storage?.items || []).find(isAccountItem),
        ]
      })()

      // this is a set of type ids which we plan to keep in our mutated metadata
      // anything not in this set will be deleted
      // we start off with just the types of the state calls we plan to make,
      // then we run those types through a function (addDependentTypes) which will also include
      // all of the types which those types depend on - recursively
      const keepTypes = new Set(
        [
          // each type can be either "Plain" or "Map"
          // if it's "Plain" we only need to get the value type
          // if it's a "Map" we want to keep both the key AND the value types
          assetsItem?.type.__kind === "Map" && assetsItem.type.key,
          assetsItem?.type.value,

          accountItem?.type.__kind === "Map" && accountItem.type.key,
          accountItem?.type.value,
        ].filter((type): type is number => typeof type === "number")
      )

      const addDependentTypes = (types: number[]) => {
        for (const typeIndex of types) {
          const type = metadata.value.lookup.types[typeIndex]
          if (!type) {
            log.warn(`Unable to find type with index ${typeIndex}`)
            continue
          }

          keepTypes.add(type.id)

          if (type?.type?.def?.__kind === "Array") addDependentTypes([type.type.def.value.type])
          if (type?.type?.def?.__kind === "Compact") addDependentTypes([type.type.def.value.type])
          if (type?.type?.def?.__kind === "Composite")
            addDependentTypes(type.type.def.value.fields.map(({ type }) => type))
          if (type?.type?.def?.__kind === "Sequence") addDependentTypes([type.type.def.value.type])
          if (type?.type?.def?.__kind === "Tuple")
            addDependentTypes(type.type.def.value.map((type) => type))
          if (type?.type?.def?.__kind === "Variant")
            addDependentTypes(
              type.type.def.value.variants.flatMap(({ fields }) => fields.map(({ type }) => type))
            )
        }
      }

      // recursively find all the types which our keepTypes depend on and add them to the keepTypes set
      addDependentTypes([...keepTypes])

      // ditch the types we aren't keeping
      const isKeepType = (type: any) => keepTypes.has(type.id)
      metadata.value.lookup.types = metadata.value.lookup.types.filter(isKeepType)

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

  async fetchSubstrateChainTokens(
    chainConnector,
    chaindataProvider,
    chainId,
    chainMeta,
    moduleConfig
  ) {
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

      ;[...((assetsResult as any)?.value ?? [])].map((asset: any) => {
        if (!asset) return
        if (!asset?.id) return

        const assetId = asset.id
        const symbol = tokenSymbolFromU64Id(assetId)
        const id = subEquilibriumTokenId(chainId, symbol)
        const decimals = asset.assetXcmData?.value?.decimals?.toNumber?.() ?? DEFAULT_DECIMALS

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
  async subscribeBalances(chainConnectors, chaindataProvider, addressesByToken, callback) {
    const chainConnector = chainConnectors.substrate
    if (!chainConnector) throw new Error(`This module requires a substrate chain connector`)

    const tokens = await chaindataProvider.tokens()
    const queriesByChain = await prepareQueriesByChain(chaindataProvider, addressesByToken, tokens)

    const subscriptions = Object.entries(queriesByChain)
      .map(async ([chainId, queries]) => {
        // set up method, return message type and params
        const subscribeMethod = "state_subscribeStorage" // method we call to subscribe
        const responseMethod = "state_storage" // type of message we expect to receive for each subscription update
        const unsubscribeMethod = "state_unsubscribeStorage" // method we call to unsubscribe
        const params = [queries.map((query) => query.stateKey)]

        // set up subscription
        const unsubscribe = await chainConnector.subscribe(
          chainId,
          subscribeMethod,
          unsubscribeMethod,
          responseMethod,
          params,
          (error, result) => {
            if (error) return callback(error)
            callback(null, formatRpcResult(chainId, queries, result))
          }
        )

        return unsubscribe
      })
      .map((subscription) =>
        subscription.catch((error) => {
          log.warn(`Failed to create subscription: ${error.message}`)
          return () => {}
        })
      )

    return () => subscriptions.forEach((promise) => promise.then((unsubscribe) => unsubscribe()))
  },

  async fetchBalances(chainConnectors, chaindataProvider, addressesByToken) {
    const chainConnector = chainConnectors.substrate
    if (!chainConnector) throw new Error(`This module requires a substrate chain connector`)

    const tokens = await chaindataProvider.tokens()
    const queriesByChain = await prepareQueriesByChain(chaindataProvider, addressesByToken, tokens)

    const balances = await Promise.all(
      Object.entries(queriesByChain).map(async ([chainId, queries]) => {
        // set up method and params
        const method = "state_queryStorageAt" // method we call to fetch
        const params = [queries.map((query) => query.stateKey)]

        // query rpc
        const result = await chainConnector.send(chainId, method, params)
        log.log("fetchBalances", result)
        return formatRpcResult(chainId, queries, result[0])
      })
    )

    return balances.reduce((allBalances, balances) => allBalances.add(balances), new Balances([]))
  },
}

function groupAddressesByTokenByChain(
  addressesByToken: AddressesByToken<SubEquilibriumToken>,
  tokens: TokenList
): Record<string, AddressesByToken<SubEquilibriumToken>> {
  return Object.entries(addressesByToken).reduce((byChain, [tokenId, addresses]) => {
    const token = tokens[tokenId]
    if (!token) {
      log.error(`Token ${tokenId} not found`)
      return byChain
    }

    const chainId = token.chain?.id
    if (!chainId) {
      log.error(`Token ${tokenId} has no chain`)
      return byChain
    }

    if (!byChain[chainId]) byChain[chainId] = {}
    byChain[chainId][tokenId] = addresses

    return byChain
  }, {} as Record<string, AddressesByToken<SubEquilibriumToken>>)
}

async function prepareQueriesByChain(
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<SubEquilibriumToken>,
  tokens: TokenList
): Promise<Record<string, StorageHelper[]>> {
  const addressesByTokenGroupedByChain = groupAddressesByTokenByChain(addressesByToken, tokens)

  return Object.fromEntries(
    await Promise.all(
      Object.entries(addressesByTokenGroupedByChain).map(async ([chainId, addressesByToken]) => {
        const chain = await chaindataProvider.getChain(chainId)
        if (!chain) throw new Error(`Failed to get chain ${chainId}`)

        const tokensAndAddresses = Object.entries(addressesByToken)
          .map(([tokenId, addresses]) => [tokenId, tokens[tokenId], addresses] as const)
          .filter(([tokenId, token]) => {
            if (!token) {
              log.error(`Token ${tokenId} not found`)
              return false
            }

            // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
            if (token.type !== "substrate-equilibrium") {
              log.debug(`This module doesn't handle tokens of type ${token.type}`)
              return false
            }

            return true
          })
          .map(([, token, addresses]): [SubEquilibriumToken, string[]] => [
            token as SubEquilibriumToken, // TODO: Rewrite the previous filter to declare this in a type-safe way
            addresses,
          ])

        const registry = new TypeRegistry()
        const chainMeta: SubEquilibriumChainMeta | undefined = (chain.balanceMetadata || []).find(
          ({ moduleType }) => moduleType === "substrate-equilibrium"
        )?.metadata
        if (
          chainMeta?.metadata !== undefined &&
          chainMeta?.metadata !== null &&
          chainMeta?.metadataVersion >= 14
        )
          registry.setMetadata(new Metadata(registry, chainMeta.metadata))

        // equilibrium returns all chain tokens for each address in the one query
        // so, we only need to make one query per address, rather than one query per token per address
        // we'll tag each query with the tokens we expect to extract from it later on
        const addressQueries: Record<string, StorageHelper> = {}

        tokensAndAddresses.forEach(([token, addresses]) =>
          addresses.forEach((address) => {
            if (!addressQueries[address])
              addressQueries[address] = new StorageHelper(
                registry,
                "system",
                "account",
                decodeAnyAddress(address)
              )

            addressQueries[address].tag(
              (addressQueries[address].tags ?? []).concat({
                token,
                address,
              })
            )
          })
        )

        const queries = Object.values(addressQueries).filter(
          (query) => query.stateKey !== undefined
        )

        return [chainId, queries]
      })
    )
  )
}

/**
 * Formats an RPC result into an instance of `Balances`
 *
 * @param chain - The chain which this result came from.
 * @param references - A lookup table for linking each balance to an `Address`.
 *                            Can be built with `BalancesRpc.buildReferences`.
 * @param result - The result returned by the RPC.
 * @returns A formatted list of balances.
 */
function formatRpcResult(chainId: ChainId, queries: StorageHelper[], result: unknown): Balances {
  if (typeof result !== "object" || result === null) return new Balances([])
  if (!hasOwnProperty(result, "changes") || typeof result.changes !== "object")
    return new Balances([])
  if (!Array.isArray(result.changes)) return new Balances([])

  const balances = result.changes
    .flatMap(([key, change]: [unknown, unknown]) => {
      if (typeof key !== "string") return

      const query = queries.find((query) => query.stateKey === key)
      if (query === undefined) return

      if (!(typeof change === "string" || change === null)) return

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
      const balances: any = query.decode(change)

      const tokenBalances = Object.fromEntries(
        (balances?.data?.value?.balance || [])
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

      return (query.tags || [])
        .filter(
          (tag: any) => typeof tag?.token?.id === "string" && typeof tag?.address === "string"
        )
        .map(({ token, address }: { token: SubEquilibriumToken; address: string }) => {
          if (!address || !token) return

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
    })
    .filter((balance): balance is Balance => Boolean(balance))

  return new Balances(balances)
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
