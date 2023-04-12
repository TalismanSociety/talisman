import { Metadata, TypeRegistry } from "@polkadot/types"
import type { Registry } from "@polkadot/types-codec/types"
import { assert } from "@polkadot/util"
import { UnsignedTransaction, defineMethod } from "@substrate/txwrapper-core"
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

type ModuleType = "substrate-tokens"

const subTokensTokenId = (chainId: ChainId, tokenSymbol: string) =>
  `${chainId}-substrate-tokens-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

export type SubTokensToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    onChainId: string | number
    chain: { id: ChainId }
  }
>

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    SubTokensToken: SubTokensToken
  }
}

export type SubTokensChainMeta = {
  isTestnet: boolean
  metadata: `0x${string}` | null
  metadataVersion: number
}

export type SubTokensModuleConfig = {
  tokens?: Array<{
    symbol?: string
    decimals?: number
    ed?: string
    onChainId?: string | number
    coingeckoId?: string
  }>
}

export type SubTokensBalance = NewBalanceType<
  ModuleType,
  {
    multiChainId: SubChainId

    free: Amount
    reserves: Amount
    locks: Amount
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    SubTokensBalance: SubTokensBalance
  }
}

export type SubTokensTransferParams = NewTransferParamsType<{
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

export const SubTokensModule: NewBalanceModule<
  ModuleType,
  SubTokensToken,
  SubTokensChainMeta,
  SubTokensModuleConfig,
  SubTokensTransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")

  const { getOrCreateTypeRegistry } = createTypeRegistryCache()

  return {
    ...DefaultBalanceModule("substrate-tokens"),

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

        const isTokensPallet = (pallet: any) => pallet.name === "Tokens"
        const isAccountsItem = (item: any) => item.name === "Accounts"

        metadata.value.pallets = metadata.value.pallets.filter(isTokensPallet)

        const accountsItem = (() => {
          const systemPallet = metadata.value.pallets.find(isTokensPallet)
          if (!systemPallet) return
          if (!systemPallet.storage) return

          systemPallet.events = undefined
          systemPallet.calls = undefined
          systemPallet.errors = undefined
          systemPallet.constants = []
          systemPallet.storage.items = systemPallet.storage.items.filter(isAccountsItem)

          return (systemPallet.storage?.items || []).find(isAccountsItem)
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
            accountsItem?.type.__kind === "Map" && accountsItem.type.key,
            accountsItem?.type.value,
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

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      const { isTestnet } = chainMeta

      const tokens: Record<string, SubTokensToken> = {}
      for (const tokenConfig of moduleConfig?.tokens || []) {
        try {
          const symbol = tokenConfig?.symbol ?? "Unknown"
          const decimals = tokenConfig?.decimals ?? 0
          const existentialDeposit = tokenConfig?.ed ?? "0"
          const onChainId = tokenConfig?.onChainId ?? undefined
          const coingeckoId = tokenConfig?.coingeckoId ?? undefined

          if (onChainId === undefined) continue

          const id = subTokensTokenId(chainId, symbol)
          const token: SubTokensToken = {
            id,
            type: "substrate-tokens",
            isTestnet,
            symbol,
            decimals,
            logo: githubTokenLogoUrl(id),
            coingeckoId,
            existentialDeposit,
            onChainId,
            chain: { id: chainId },
          }

          tokens[token.id] = token
        } catch (error) {
          log.error(
            `Failed to build substrate-tokens token ${tokenConfig.onChainId} (${tokenConfig.symbol}) on ${chainId}`,
            (error as Error)?.message ?? error
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

      if (token.type !== "substrate-tokens")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.getChain(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const { genesisHash } = chain

      const currencyId = (() => {
        try {
          return JSON.parse(token.onChainId as any)
        } catch (error) {
          return token.onChainId
        }
      })()

      // different chains use different orml transfer methods
      // we'll try each one in sequence until we get one that doesn't throw an error
      let unsigned: UnsignedTransaction | undefined = undefined
      const errors: Error[] = []

      const currenciesPallet = "currencies"
      const currenciesMethod = "transfer"
      const currenciesArgs = { dest: to, currencyId, amount }

      const sendAll = transferMethod === "transferAll"

      const tokensPallet = "tokens"
      const tokensMethod = transferMethod
      const tokensArgs = sendAll
        ? { dest: to, currencyId, keepAlive: false }
        : { dest: to, currencyId, amount }

      const commonDefineMethodFields = {
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
      }

      const unsignedMethods = [
        () =>
          defineMethod(
            {
              method: {
                pallet: currenciesPallet,
                name: currenciesMethod,
                args: currenciesArgs,
              },
              ...commonDefineMethodFields,
            },
            { metadataRpc, registry }
          ),
        () =>
          defineMethod(
            {
              method: {
                pallet: tokensPallet,
                name: tokensMethod,
                args: tokensArgs,
              },
              ...commonDefineMethodFields,
            },
            { metadataRpc, registry }
          ),
      ]

      for (const method of unsignedMethods) {
        try {
          unsigned = method()
        } catch (error: unknown) {
          errors.push(error as Error)
        }
      }

      if (unsigned === undefined) {
        errors.forEach((error) => log.error(error))
        throw new Error(`${token.symbol} transfers are not supported at this time.`)
      }

      return { type: "substrate", tx: unsigned }
    },
  }
}

function groupAddressesByTokenByChain(
  addressesByToken: AddressesByToken<SubTokensToken>,
  tokens: TokenList
): Record<string, AddressesByToken<SubTokensToken>> {
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
  }, {} as Record<string, AddressesByToken<SubTokensToken>>)
}

async function prepareQueriesByChain(
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<SubTokensToken>,
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
            if (token.type !== "substrate-tokens") {
              log.debug(`This module doesn't handle tokens of type ${token.type}`)
              return false
            }

            return true
          })
          .map(([, token, addresses]): [SubTokensToken, string[]] => [
            token as SubTokensToken, // TODO: Rewrite the previous filter to declare this in a type-safe way
            addresses,
          ])

        const chainMeta: SubTokensChainMeta | undefined = (chain.balanceMetadata || []).find(
          ({ moduleType }) => moduleType === "substrate-tokens"
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
                "tokens",
                "accounts",
                decodeAnyAddress(address),
                (() => {
                  try {
                    return JSON.parse(token.onChainId as any)
                  } catch (error) {
                    return token.onChainId
                  }
                })()
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
      // {
      //   free: 33,765,103,752,560
      //   reserved: 0
      //   frozen: 0
      // }
      const balance = (query.decode(change) as any) ?? {
        free: "0",
        reserved: "0",
        frozen: "0",
      }

      const { address, token } = query.tags || {}
      if (!address || !token || !balance) return

      const free = (balance?.free?.toBigInt?.() || BigInt("0")).toString()
      const reserved = (balance?.reserved?.toBigInt?.() || BigInt("0")).toString()
      const frozen = (balance?.frozen?.toBigInt?.() || BigInt("0")).toString()

      return new Balance({
        source: "substrate-tokens",

        status: "live",

        address,
        multiChainId: { subChainId: chainId },
        chainId,
        tokenId: token.id,

        free,
        reserves: reserved,
        locks: frozen,
      })
    })
    .filter((balance): balance is Balance => Boolean(balance))

  return new Balances(balances)
}
