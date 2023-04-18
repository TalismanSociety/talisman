import { Metadata, TypeRegistry } from "@polkadot/types"
import type { Registry } from "@polkadot/types-codec/types"
import { BN, assert } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
import {
  AddressesByToken,
  Amount,
  Balance,
  Balances,
  DefaultBalanceModule,
  NewBalanceModule,
  NewBalanceType,
  NewTransferParamsType,
  StorageHelper,
  createTypeRegistryCache,
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

type ModuleType = "substrate-assets"

const subAssetTokenId = (chainId: ChainId, assetId: string, tokenSymbol: string) =>
  `${chainId}-substrate-assets-${assetId}-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

export type SubAssetsToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    assetId: string
    isFrozen: boolean
    chain: { id: ChainId }
  }
>

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    SubAssetsToken: SubAssetsToken
  }
}

export type SubAssetsChainMeta = {
  isTestnet: boolean
  metadata: `0x${string}` | null
  metadataVersion: number
}

export type SubAssetsModuleConfig = {
  tokens?: Array<{
    assetId: string | number
    symbol?: string
    coingeckoId?: string
  }>
}

export type SubAssetsBalance = NewBalanceType<
  ModuleType,
  {
    multiChainId: SubChainId

    free: Amount
    locks: Amount
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    SubAssetsBalance: SubAssetsBalance
  }
}

export type SubAssetsTransferParams = NewTransferParamsType<{
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

  const { getOrCreateTypeRegistry } = createTypeRegistryCache()

  return {
    ...DefaultBalanceModule("substrate-assets"),

    async fetchSubstrateChainMeta(chainId) {
      const isTestnet = (await chaindataProvider.getChain(chainId))?.isTestnet || false

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

        const isAssetsPallet = (pallet: { name: string }) => pallet.name === "Assets"
        const isAccountItem = (item: { name: string }) => item.name === "Account"
        const isAssetItem = (item: { name: string }) => item.name === "Asset"
        const isMetadataItem = (item: { name: string }) => item.name === "Metadata"

        metadata.value.pallets = metadata.value.pallets.filter(isAssetsPallet)

        const [accountItem, assetItem, metadataItem] = (() => {
          const systemPallet = metadata.value.pallets.find(isAssetsPallet)
          if (!systemPallet) return []
          if (!systemPallet.storage) return []

          const isAccountOrAssetOrMetadataItem = [
            isAccountItem,
            isAssetItem,
            isMetadataItem,
          ].reduce((combinedFilter, filter) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            combinedFilter ? (item: any) => combinedFilter(item) || filter(item) : filter
          )

          systemPallet.events = undefined
          systemPallet.calls = undefined
          systemPallet.errors = undefined
          systemPallet.constants = []
          systemPallet.storage.items = systemPallet.storage.items.filter(
            isAccountOrAssetOrMetadataItem
          )

          return [
            (systemPallet.storage?.items || []).find(isAccountItem),
            (systemPallet.storage?.items || []).find(isAssetItem),
            (systemPallet.storage?.items || []).find(isMetadataItem),
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
            accountItem?.type.__kind === "Map" && accountItem.type.key,
            accountItem?.type.value,

            assetItem?.type.__kind === "Map" && assetItem.type.key,
            assetItem?.type.value,

            metadataItem?.type.__kind === "Map" && metadataItem.type.key,
            metadataItem?.type.value,
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
            if (type?.type?.def?.__kind === "Sequence")
              addDependentTypes([type.type.def.value.type])
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
        const isKeepType = (type: { id: number }) => keepTypes.has(type.id)
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

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      const { isTestnet, metadata: metadataRpc, metadataVersion } = chainMeta

      const registry = new TypeRegistry()
      if (metadataRpc !== null && metadataVersion >= 14)
        registry.setMetadata(new Metadata(registry, metadataRpc))

      const tokens: Record<string, SubAssetsToken> = {}
      for (const tokenConfig of moduleConfig?.tokens || []) {
        try {
          const assetId = new BN(tokenConfig.assetId)

          const assetQuery = new StorageHelper(registry, "assets", "asset", assetId)
          const metadataQuery = new StorageHelper(registry, "assets", "metadata", assetId)

          const [
            // e.g.
            // Option<{
            //   owner: HKKT5DjFaUE339m7ZWS2yutjecbUpBcDQZHw2EF7SFqSFJH
            //   issuer: HKKT5DjFaUE339m7ZWS2yutjecbUpBcDQZHw2EF7SFqSFJH
            //   admin: HKKT5DjFaUE339m7ZWS2yutjecbUpBcDQZHw2EF7SFqSFJH
            //   freezer: HKKT5DjFaUE339m7ZWS2yutjecbUpBcDQZHw2EF7SFqSFJH
            //   supply: 99,996,117,733,044,042
            //   deposit: 1,000,000,000,000
            //   minBalance: 100,000
            //   isSufficient: true
            //   accounts: 6,032
            //   sufficients: 1,542
            //   approvals: 1
            //   status: Live
            // }>
            assetsAsset,

            // e.g.
            // {
            //   deposit: 6,693,333,000
            //   name: RMRK.app
            //   symbol: RMRK
            //   decimals: 10
            //   isFrozen: false
            // }
            assetsMetadata,
          ] = await Promise.all([
            chainConnector
              .send(chainId, "state_getStorage", [assetQuery.stateKey])
              .then((result) => assetQuery.decode(result)),
            chainConnector
              .send(chainId, "state_getStorage", [metadataQuery.stateKey])
              .then((result) => metadataQuery.decode(result)),
          ])

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const unsafeAssetsMetadata = assetsMetadata as any | undefined
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const unsafeAssetsAsset = assetsAsset as any | undefined

          const existentialDeposit =
            unsafeAssetsAsset?.value?.minBalance?.toBigInt?.()?.toString?.() ?? "0"
          const symbol =
            tokenConfig.symbol ?? unsafeAssetsMetadata?.symbol?.toHuman?.() ?? "Unknown"
          const decimals = unsafeAssetsMetadata?.decimals?.toNumber?.() ?? 0
          const isFrozen = unsafeAssetsMetadata?.isFrozen?.toHuman?.() ?? false
          const coingeckoId =
            typeof tokenConfig.coingeckoId === "string" ? tokenConfig.coingeckoId : undefined

          const id = subAssetTokenId(chainId, assetId.toString(10), symbol)
          const token: SubAssetsToken = {
            id,
            type: "substrate-assets",
            isTestnet,
            symbol,
            decimals,
            logo: githubTokenLogoUrl(id),
            coingeckoId,
            existentialDeposit,
            assetId: assetId.toString(10),
            isFrozen,
            chain: { id: chainId },
          }

          tokens[token.id] = token
        } catch (error) {
          log.error(
            `Failed to build substrate-assets token ${tokenConfig.assetId} (${tokenConfig.symbol}) on ${chainId}`,
            error
          )
          continue
        }
      }

      return tokens
    },

    // TODO: Don't create empty subscriptions
    async subscribeBalances(addressesByToken, callback) {
      const chainConnector = chainConnectors.substrate
      if (!chainConnector) throw new Error(`This module requires a substrate chain connector`)

      const tokens = await chaindataProvider.tokens()
      const queriesByChain = await prepareQueriesByChain(
        chaindataProvider,
        addressesByToken,
        tokens,
        getOrCreateTypeRegistry
      )

      const subscriptions = Object.entries(queriesByChain)
        .map(async ([chainId, queries]) => {
          // set up method, return message type and params
          const subscribeMethod = "state_subscribeStorage" // method we call to subscribe
          const responseMethod = "state_storage" // type of message we expect to receive for each subscription update
          const unsubscribeMethod = "state_unsubscribeStorage" // method we call to unsubscribe
          const params = [queries.map((query) => query.stateKey)]

          // set up subscription
          const timeout = false
          const unsubscribe = await chainConnector.subscribe(
            chainId,
            subscribeMethod,
            responseMethod,
            params,
            (error, result) => {
              if (error) return callback(error)
              callback(null, formatRpcResult(chainId, queries, result))
            },
            timeout
          )

          return () => unsubscribe(unsubscribeMethod)
        })
        .map((subscription) =>
          subscription.catch((error) => {
            log.warn(`Failed to create subscription: ${error.message}`)
            return () => {}
          })
        )

      return () =>
        subscriptions.forEach((subscription) => subscription.then((unsubscribe) => unsubscribe()))
    },

    async fetchBalances(addressesByToken) {
      const chainConnector = chainConnectors.substrate
      if (!chainConnector) throw new Error(`This module requires a substrate chain connector`)

      const tokens = await chaindataProvider.tokens()
      const queriesByChain = await prepareQueriesByChain(
        chaindataProvider,
        addressesByToken,
        tokens,
        getOrCreateTypeRegistry
      )

      const balances = await Promise.all(
        Object.entries(queriesByChain).map(async ([chainId, queries]) => {
          // set up method and params
          const method = "state_queryStorageAt" // method we call to fetch
          const params = [queries.map((query) => query.stateKey)]

          // query rpc
          const result = await chainConnector.send(chainId, method, params)
          return formatRpcResult(chainId, queries, result[0])
        })
      )

      return balances.reduce((allBalances, balances) => allBalances.add(balances), new Balances([]))
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

      if (token.type !== "substrate-assets")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.getChain(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const { genesisHash } = chain

      const id = token.assetId

      const pallet = "assets"
      const method =
        // the assets pallet has no transferAll method
        transferMethod === "transferAll" ? "transfer" : transferMethod
      const args = { id, target: { Id: to }, amount }

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

function groupAddressesByTokenByChain(
  addressesByToken: AddressesByToken<SubAssetsToken>,
  tokens: TokenList
): Record<string, AddressesByToken<SubAssetsToken>> {
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
  }, {} as Record<string, AddressesByToken<SubAssetsToken>>)
}

async function prepareQueriesByChain(
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<SubAssetsToken>,
  tokens: TokenList,
  getOrCreateTypeRegistry: (chainId: ChainId, metadataRpc: `0x${string}`) => Registry
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
            if (token.type !== "substrate-assets") {
              log.debug(`This module doesn't handle tokens of type ${token.type}`)
              return false
            }

            return true
          })
          .map(([, token, addresses]): [SubAssetsToken, string[]] => [
            token as SubAssetsToken, // TODO: Rewrite the previous filter to declare this in a type-safe way
            addresses,
          ])

        const chainMeta: SubAssetsChainMeta | undefined = (chain.balanceMetadata || []).find(
          ({ moduleType }) => moduleType === "substrate-assets"
        )?.metadata
        const registry =
          chainMeta?.metadata !== undefined &&
          chainMeta?.metadata !== null &&
          chainMeta?.metadataVersion >= 14
            ? getOrCreateTypeRegistry(chainId, chainMeta.metadata)
            : new TypeRegistry()

        const queries = tokensAndAddresses
          .flatMap(([token, addresses]) =>
            addresses.map((address) =>
              new StorageHelper(
                registry,
                "assets",
                "account",
                token.assetId,
                decodeAnyAddress(address)
              ).tag({ token, address })
            )
          )
          .filter((query) => query.stateKey !== undefined)

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
    .map(([key, change]: [unknown, unknown]) => {
      if (typeof key !== "string") return

      const query = queries.find((query) => query.stateKey === key)
      if (query === undefined) return

      if (!(typeof change === "string" || change === null)) return

      // e.g.
      // Option<{
      //   balance: 2,000,000,000
      //   isFrozen: false
      //   reason: Sufficient
      //   extra: null
      // }>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const balance = (query.decode(change) as any)?.value ?? {
        balance: "0",
        isFrozen: false,
      }

      const { address, token } = query.tags || {}
      if (!address || !token || !balance) return

      const free =
        token.isFrozen || balance?.isFrozen?.toHuman?.()
          ? BigInt("0").toString()
          : (balance?.balance?.toBigInt?.() || BigInt("0")).toString()
      const frozen = token.isFrozen
        ? (balance?.balance?.toBigInt?.() || BigInt("0")).toString()
        : BigInt("0").toString()

      return new Balance({
        source: "substrate-assets",

        status: "live",

        address,
        multiChainId: { subChainId: chainId },
        chainId,
        tokenId: token.id,

        free,
        locks: frozen,
      })
    })
    .filter((balance): balance is Balance => Boolean(balance))

  return new Balances(balances)
}
