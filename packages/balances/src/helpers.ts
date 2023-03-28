import { Metadata, StorageKey, TypeRegistry, decorateStorage } from "@polkadot/types"
import type { Registry } from "@polkadot/types-codec/types"
import { ChainId, IToken } from "@talismn/chaindata-provider"

import {
  BalanceModule,
  DefaultChainMeta,
  DefaultModuleConfig,
  DefaultTransferParams,
  ExtendableChainMeta,
  ExtendableModuleConfig,
  ExtendableTokenType,
  ExtendableTransferParams,
} from "./BalanceModule"
import log from "./log"
import {
  AddressesByToken,
  Balance,
  BalanceJson,
  Balances,
  SubscriptionCallback,
  UnsubscribeFn,
} from "./types"

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

export const createTypeRegistryCache = () => {
  const typeRegistryCache: Map<ChainId, TypeRegistry> = new Map()

  const getOrCreateTypeRegistry = (chainId: ChainId, metadataRpc?: `0x${string}`): Registry => {
    // TODO: Delete cache when metadataRpc is different from last time
    const cached = typeRegistryCache.get(chainId)
    if (cached) return cached

    const typeRegistry = new TypeRegistry()
    if (typeof metadataRpc === "string") {
      const metadata = new Metadata(typeRegistry, metadataRpc)
      metadata.registry.setMetadata(metadata)
    }

    typeRegistryCache.set(chainId, typeRegistry)

    return typeRegistry
  }

  return { getOrCreateTypeRegistry }
}

export const filterMirrorTokens = (balance: Balance, i: number, balances: Balance[]) => {
  // TODO: implement a mirrorOf property, which should be set from chaindata
  const mirrorOf = (balance.token as (IToken & { mirrorOf?: string | null }) | null)?.mirrorOf
  return !mirrorOf || !balances.find((b) => b.tokenId === mirrorOf)
}

/**
 * Sets all balance statuses from `live-${string}` to either `live` or `cached`
 */
export const deriveStatuses = (
  latestSubscriptionId: string | undefined,
  balances: BalanceJson[]
): BalanceJson[] =>
  balances.map((balance) => {
    if (balance.status === "live" || balance.status === "cache" || balance.status === "stale")
      return balance

    if (!latestSubscriptionId) return { ...balance, status: "cache" }

    if (balance.status.slice("live-".length) !== latestSubscriptionId)
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

  tags: any = null

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
