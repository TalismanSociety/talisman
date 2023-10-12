import { Metadata, StorageKey, TypeRegistry, decorateStorage } from "@polkadot/types"
import type { Registry } from "@polkadot/types-codec/types"
import { ChainConnector } from "@talismn/chain-connector"
import { Chain, ChainId } from "@talismn/chaindata-provider"
import { hasOwnProperty } from "@talismn/util"
import groupBy from "lodash/groupBy"

import {
  BalanceModule,
  DefaultChainMeta,
  DefaultModuleConfig,
  DefaultTransferParams,
  ExtendableChainMeta,
  ExtendableModuleConfig,
  ExtendableTokenType,
  ExtendableTransferParams,
  NewBalanceModule,
} from "../../BalanceModule"
import log from "../../log"
import {
  AddressesByToken,
  BalanceJson,
  Balances,
  MiniMetadata,
  SubscriptionCallback,
  UnsubscribeFn,
  deriveMiniMetadataId,
} from "../../types"

/**
 * Wraps a BalanceModule's fetch/subscribe methods with a single `balances` method.
 * This `balances` method will subscribe if a callback parameter is provided, or otherwise fetch.
 */
export async function balances<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
>(
  balanceModule: BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig, TTransferParams>,
  addressesByToken: AddressesByToken<TTokenType>
): Promise<Balances>
export async function balances<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
>(
  balanceModule: BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig, TTransferParams>,
  addressesByToken: AddressesByToken<TTokenType>,
  callback: SubscriptionCallback<Balances>
): Promise<UnsubscribeFn>
export async function balances<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
>(
  balanceModule: BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig, TTransferParams>,
  addressesByToken: AddressesByToken<TTokenType>,
  callback?: SubscriptionCallback<Balances>
): Promise<Balances | UnsubscribeFn> {
  // subscription request
  if (callback !== undefined)
    return await balanceModule.subscribeBalances(addressesByToken, callback)

  // one-off request
  return await balanceModule.fetchBalances(addressesByToken)
}

export type GetOrCreateTypeRegistry = (chainId: ChainId, metadataRpc?: `0x${string}`) => Registry

export const createTypeRegistryCache = () => {
  const typeRegistryCache: Map<
    ChainId,
    { metadataRpc: `0x${string}` | undefined; typeRegistry: Registry }
  > = new Map()

  const getOrCreateTypeRegistry: GetOrCreateTypeRegistry = (chainId, metadataRpc) => {
    const cached = typeRegistryCache.get(chainId)
    if (cached && cached.metadataRpc === metadataRpc) return cached.typeRegistry

    const typeRegistry = new TypeRegistry()
    if (typeof metadataRpc === "string") {
      try {
        const metadata = new Metadata(typeRegistry, metadataRpc)
        metadata.registry.setMetadata(metadata)
      } catch (cause) {
        log.warn(new Error(`Failed to set metadata for chain ${chainId}`, { cause }), cause)
      }
    }

    typeRegistryCache.set(chainId, { metadataRpc, typeRegistry })

    return typeRegistry
  }

  return { getOrCreateTypeRegistry }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBalanceModule = BalanceModule<any, any, any, any, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyNewBalanceModule = NewBalanceModule<any, any, any, any, any>

/**
 * The following `Infer*` collection of generic types can be used when you want to
 * extract one of the generic type arguments from an existing BalanceModule.
 *
 * For example, you might want to write a function which can accept any BalanceModule
 * as an input, and then return the specific TokenType for that module:
 * function getTokens<T extends AnyBalanceModule>(module: T): InferTokenType<T>
 *
 * Or for another example, you might want a function which can take any BalanceModule `type`
 * string as input, and then return some data associated with that module with the correct type:
 * function getChainMeta<T extends AnyBalanceModule>(type: InferModuleType<T>): InferChainMeta<T> | undefined
 */
type InferBalanceModuleTypes<T extends AnyNewBalanceModule> = T extends NewBalanceModule<
  infer TModuleType,
  infer TTokenType,
  infer TChainMeta,
  infer TModuleConfig,
  infer TTransferParams
>
  ? {
      TModuleType: TModuleType
      TTokenType: TTokenType
      TChainMeta: TChainMeta
      TModuleConfig: TModuleConfig
      TTransferParams: TTransferParams
    }
  : never
export type InferModuleType<T extends AnyNewBalanceModule> =
  InferBalanceModuleTypes<T>["TModuleType"]
export type InferTokenType<T extends AnyNewBalanceModule> = InferBalanceModuleTypes<T>["TTokenType"]
export type InferChainMeta<T extends AnyNewBalanceModule> = InferBalanceModuleTypes<T>["TChainMeta"]
export type InferModuleConfig<T extends AnyNewBalanceModule> =
  InferBalanceModuleTypes<T>["TModuleConfig"]
export type InferTransferParams<T extends AnyNewBalanceModule> =
  InferBalanceModuleTypes<T>["TTransferParams"]

/**
 * Given a `moduleType` and a `chain` from a chaindataProvider, this function will find the chainMeta
 * associated with the given balanceModule for the given chain.
 */
export const findChainMeta = <TBalanceModule extends AnyNewBalanceModule>(
  miniMetadatas: Map<string, MiniMetadata>,
  moduleType: InferModuleType<TBalanceModule>,
  chain?: Chain
): InferChainMeta<TBalanceModule> | undefined => {
  if (!chain) return undefined
  if (!chain.specName) return undefined
  if (!chain.specVersion) return undefined

  // TODO: This is spaghetti to import this here, it should be injected into each balance module or something.
  const metadataId = deriveMiniMetadataId({
    source: moduleType,
    chainId: chain.id,
    specName: chain.specName,
    specVersion: chain.specVersion,
    balancesConfig: JSON.stringify(
      chain.balancesConfig.find((config) => config.moduleType === moduleType)?.moduleConfig ?? {}
    ),
  })

  // TODO: Fix this (needs to fetch miniMetadata without being async)
  const miniMetadata = miniMetadatas.get(metadataId)
  const chainMeta: InferChainMeta<TBalanceModule> | undefined = miniMetadata
    ? {
        miniMetadata: miniMetadata.data,
        metadataVersion: miniMetadata.version,
        ...JSON.parse(miniMetadata.extra),
      }
    : undefined

  return chainMeta
}

export const getValidSubscriptionIds = () => {
  return new Set(localStorage.getItem("TalismanBalancesSubscriptionIds")?.split(",") ?? [])
}
export const createSubscriptionId = () => {
  // delete current id (if exists)
  deleteSubscriptionId()

  // create new id
  const subscriptionId = Date.now().toString()
  sessionStorage.setItem("TalismanBalancesSubscriptionId", subscriptionId)

  // add to list of current ids
  const subscriptionIds = getValidSubscriptionIds()
  subscriptionIds.add(subscriptionId)
  localStorage.setItem(
    "TalismanBalancesSubscriptionIds",
    [...subscriptionIds].filter(Boolean).join(",")
  )

  return subscriptionId
}
export const deleteSubscriptionId = () => {
  const subscriptionId = sessionStorage.getItem("TalismanBalancesSubscriptionId")
  if (!subscriptionId) return

  const subscriptionIds = getValidSubscriptionIds()
  subscriptionIds.delete(subscriptionId)
  localStorage.setItem(
    "TalismanBalancesSubscriptionIds",
    [...subscriptionIds].filter(Boolean).join(",")
  )
}

/**
 * Sets all balance statuses from `live-${string}` to either `live` or `cached`
 */
export const deriveStatuses = (
  validSubscriptionIds: string[],
  balances: BalanceJson[]
): BalanceJson[] =>
  balances.map((balance) => {
    if (balance.status === "live" || balance.status === "cache" || balance.status === "stale")
      return balance

    if (validSubscriptionIds.length < 1) return { ...balance, status: "cache" }

    if (!validSubscriptionIds.includes(balance.status.slice("live-".length)))
      return { ...balance, status: "cache" }

    return { ...balance, status: "live" }
  })

/**
 * Used by a variety of balance modules to help encode and decode substrate state calls.
 */
export class StorageHelper {
  #registry
  #storageKey

  #module
  #method
  #parameters

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tags: any = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(registry: Registry, module: string, method: string, ...parameters: any[]) {
    this.#registry = registry

    this.#module = module
    this.#method = method
    this.#parameters = parameters

    const _metadataVersion = 0 // is not used inside the decorateStorage function
    let query
    try {
      query = decorateStorage(registry, registry.metadata, _metadataVersion)
    } catch (error) {
      log.debug(`Failed to decorate storage: ${(error as Error).message}`)
      this.#storageKey = null
    }

    try {
      if (!query) throw new Error(`decoratedStorage unavailable`)
      this.#storageKey = new StorageKey(
        registry,
        parameters ? [query[module][method], parameters] : query[module][method]
      )
    } catch (error) {
      log.debug(
        `Failed to create storageKey ${module || "unknown"}.${method || "unknown"}: ${
          (error as Error).message
        }`
      )
      this.#storageKey = null
    }
  }

  get stateKey() {
    return this.#storageKey?.toHex()
  }

  get module() {
    return this.#module
  }
  get method() {
    return this.#method
  }
  get parameters() {
    return this.#parameters
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tag(tags: any) {
    this.tags = tags
    return this
  }

  decode(input?: string | null) {
    if (!this.#storageKey) return
    return this.#decodeStorageScaleResponse(this.#registry, this.#storageKey, input)
  }

  #decodeStorageScaleResponse(
    typeRegistry: Registry,
    storageKey: StorageKey,
    input?: string | null
  ) {
    if (input === undefined || input === null) return

    const type = storageKey.outputType || "Raw"
    const meta = storageKey.meta || {
      fallback: undefined,
      modifier: { isOptional: true },
      type: { asMap: { linked: { isTrue: false } }, isMap: false },
    }

    try {
      return typeRegistry.createTypeUnsafe(
        type,
        [
          meta.modifier.isOptional
            ? typeRegistry.createTypeUnsafe(type, [input], { isPedantic: true })
            : input,
        ],
        { isOptional: meta.modifier.isOptional, isPedantic: !meta.modifier.isOptional }
      )
    } catch (error) {
      throw new Error(
        `Unable to decode storage ${storageKey.section || "unknown"}.${
          storageKey.method || "unknown"
        }: ${(error as Error).message}`
      )
    }
  }
}

/**
 * Pass some these into an `RpcStateQueryHelper` in order to easily batch multiple state queries into the one rpc call.
 */
export type RpcStateQuery<T> = {
  chainId: string
  stateKey: string
  decodeResult: (change: string | null) => T
}

/**
 * Used by a variety of balance modules to help batch multiple state queries into the one rpc call.
 */
export class RpcStateQueryHelper<T> {
  #chainConnector: ChainConnector
  #queries: Array<RpcStateQuery<T>>

  constructor(chainConnector: ChainConnector, queries: Array<RpcStateQuery<T>>) {
    this.#chainConnector = chainConnector
    this.#queries = queries
  }

  async subscribe(
    callback: SubscriptionCallback<T[]>,
    timeout: number | false = false,
    subscribeMethod = "state_subscribeStorage",
    responseMethod = "state_storage",
    unsubscribeMethod = "state_unsubscribeStorage"
  ): Promise<UnsubscribeFn> {
    const queriesByChain = groupBy(this.#queries, "chainId")

    const subscriptions = Object.entries(queriesByChain).map(([chainId, queries]) => {
      const params = [queries.map(({ stateKey }) => stateKey)]

      const unsub = this.#chainConnector.subscribe(
        chainId,
        subscribeMethod,
        responseMethod,
        params,
        (error, result) => {
          error
            ? callback(error)
            : callback(null, this.#distributeChangesToQueryDecoders.call(this, chainId, result))
        },
        timeout
      )

      return () => unsub.then((unsubscribe) => unsubscribe(unsubscribeMethod))
    })

    return () => subscriptions.forEach((unsubscribe) => unsubscribe())
  }

  async fetch(method = "state_queryStorageAt"): Promise<T[]> {
    const queriesByChain = groupBy(this.#queries, "chainId")

    const resultsByChain = await Promise.all(
      Object.entries(queriesByChain).map(async ([chainId, queries]) => {
        const params = [queries.map(({ stateKey }) => stateKey)]

        const result = (await this.#chainConnector.send(chainId, method, params))[0]
        return this.#distributeChangesToQueryDecoders.call(this, chainId, result)
      })
    )

    return resultsByChain.flatMap((result) => result)
  }

  #distributeChangesToQueryDecoders(chainId: ChainId, result: unknown): T[] {
    if (typeof result !== "object" || result === null) return []
    if (!hasOwnProperty(result, "changes") || typeof result.changes !== "object") return []
    if (!Array.isArray(result.changes)) return []

    return result.changes.flatMap(([reference, change]: [unknown, unknown]): [T] | [] => {
      if (typeof reference !== "string") {
        log.warn(`Received non-string reference in RPC result: ${reference}`)
        return []
      }

      if (typeof change !== "string" && change !== null) {
        log.warn(`Received non-string and non-null change in RPC result: ${reference} | ${change}`)
        return []
      }

      const query = this.#queries.find(
        ({ chainId: cId, stateKey }) => cId === chainId && stateKey === reference
      )
      if (!query) {
        log.warn(
          `Failed to find query:\n${reference} in\n${this.#queries.map(({ stateKey }) => stateKey)}`
        )
        return []
      }

      return [query.decodeResult(change)]
    })
  }
}
