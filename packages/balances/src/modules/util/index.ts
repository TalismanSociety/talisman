import type { Registry } from "@polkadot/types-codec/types"
import { decorateStorage, Metadata, StorageKey, TypeRegistry } from "@polkadot/types"
import { ChainConnector } from "@talismn/chain-connector"
import { Chain, ChainId, ChainList, TokenList } from "@talismn/chaindata-provider"
import { $metadataV14, getShape } from "@talismn/scale"
import * as $ from "@talismn/subshape-fork"
import { hasOwnProperty } from "@talismn/util"
import camelCase from "lodash/camelCase"
import groupBy from "lodash/groupBy"

import {
  BalanceModule,
  DefaultChainMeta,
  DefaultModuleConfig,
  DefaultTransferParams,
  ExtendableChainMeta,
  ExtendableModuleConfig,
  ExtendableTransferParams,
  NewBalanceModule,
  SelectableTokenType,
  SubscriptionResultWithStatus,
} from "../../BalanceModule"
import log from "../../log"
import {
  AddressesByToken,
  Balances,
  deriveMiniMetadataId,
  MiniMetadata,
  SubscriptionCallback,
  UnsubscribeFn,
} from "../../types"

/**
 * Wraps a BalanceModule's fetch/subscribe methods with a single `balances` method.
 * This `balances` method will subscribe if a callback parameter is provided, or otherwise fetch.
 */
export async function balances<
  TModuleType extends string,
  TTokenType extends SelectableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
>(
  balanceModule: BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig, TTransferParams>,
  addressesByToken: AddressesByToken<TTokenType>
): Promise<Balances>
export async function balances<
  TModuleType extends string,
  TTokenType extends SelectableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
>(
  balanceModule: BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig, TTransferParams>,
  addressesByToken: AddressesByToken<TTokenType>,
  callback: SubscriptionCallback<Balances | SubscriptionResultWithStatus>
): Promise<UnsubscribeFn>
export async function balances<
  TModuleType extends string,
  TTokenType extends SelectableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
>(
  balanceModule: BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig, TTransferParams>,
  addressesByToken: AddressesByToken<TTokenType>,
  callback?: SubscriptionCallback<Balances | SubscriptionResultWithStatus>
): Promise<Balances | UnsubscribeFn> {
  // subscription request
  if (callback !== undefined)
    return await balanceModule.subscribeBalances({ addressesByToken }, callback)

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
): [InferChainMeta<TBalanceModule> | undefined, MiniMetadata | undefined] => {
  if (!chain) return [undefined, undefined]
  if (!chain.specName) return [undefined, undefined]
  if (!chain.specVersion) return [undefined, undefined]

  // TODO: This is spaghetti to import this here, it should be injected into each balance module or something.
  const metadataId = deriveMiniMetadataId({
    source: moduleType,
    chainId: chain.id,
    specName: chain.specName,
    specVersion: chain.specVersion,
    balancesConfig: JSON.stringify(
      chain.balancesConfig?.find((config) => config.moduleType === moduleType)?.moduleConfig ?? {}
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

  return [chainMeta, miniMetadata]
}

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

export const subshapeStorageDecoder =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (miniMetadata: MiniMetadata, module: string, method: string) => {
    if (miniMetadata.version !== 14) {
      log.warn(
        `Cannot decode metadata version ${miniMetadata.version} (${miniMetadata.chainId} ${miniMetadata.source})`
      )
      return
    }

    module = camelCase(module)
    method = camelCase(method)

    if (miniMetadata.data === null) return
    const metadata = $metadataV14.decode($.decodeHex(miniMetadata.data))

    const typeId = metadata.pallets
      .find((pallet) => camelCase(pallet.name) === module)
      ?.storage?.entries?.find((entry) => camelCase(entry.name) === method)?.value

    if (!typeId) {
      log.warn(
        `Type definition not found in metadata for ${module}::${method} (${miniMetadata.chainId} ${miniMetadata.source})`
      )
      return
    }

    return getShape(metadata, typeId)
  }

export const getUniqueChainIds = (
  addressesByToken: AddressesByToken<{ id: string }>,
  tokens: TokenList
): ChainId[] => [
  ...new Set(
    Object.keys(addressesByToken)
      .map((tokenId) => tokens[tokenId]?.chain?.id)
      .flatMap((chainId) => (chainId ? [chainId] : []))
  ),
]

type StorageDecoderParams<
  TBalanceModule extends AnyNewBalanceModule,
  TDecoders extends { [key: string]: [string, string] }
> = {
  chains: ChainList
  miniMetadatas: Map<string, MiniMetadata>
  moduleType: InferModuleType<TBalanceModule>
  decoders: TDecoders
}

export type StorageDecoders = Map<ChainId, Record<string, $.AnyShape | undefined>>

export const buildStorageDecoders = <
  TBalanceModule extends AnyNewBalanceModule,
  TDecoders extends { [key: string]: [string, string] }
>({
  chains,
  miniMetadatas,
  moduleType,
  decoders,
}: StorageDecoderParams<TBalanceModule, TDecoders>): StorageDecoders =>
  new Map(
    Object.entries(chains).flatMap(([chainId, chain]) => {
      const [, miniMetadata] = findChainMeta<TBalanceModule>(miniMetadatas, moduleType, chain)
      if (!miniMetadata) return []
      if (miniMetadata.version < 14) return []

      const builtDecoders = Object.fromEntries(
        Object.entries(decoders).map(
          ([key, [module, method]]: [keyof TDecoders, [string, string]]) =>
            [key, subshapeStorageDecoder(miniMetadata, module, method)] as const
        )
      ) as { [Property in keyof TDecoders]: $.AnyShape | undefined }

      return [[chainId, builtDecoders]]
    })
  )

/**
 *
 * Detect Balances::transfer -> Balances::transfer_allow_death migration
 * https://github.com/paritytech/substrate/pull/12951
 *
 * `transfer_allow_death` is the preferred method,
 * so if something goes wrong during detection, we should assume the chain has migrated
 * @param metadataRpc string containing the hashed RPC metadata for the chain
 * @returns
 */
export const detectTransferMethod = (metadataRpc: `0x${string}`) => {
  const pjsMetadata: Metadata = new Metadata(new TypeRegistry(), metadataRpc)
  pjsMetadata.registry.setMetadata(pjsMetadata)
  const balancesPallet = pjsMetadata.asLatest.pallets.find((pallet) => pallet.name.eq("Balances"))

  const balancesCallsTypeIndex = balancesPallet?.calls.value.type.toNumber()
  const balancesCallsType =
    balancesCallsTypeIndex !== undefined
      ? pjsMetadata.asLatest.lookup.types[balancesCallsTypeIndex]
      : undefined
  const hasDeprecatedTransferCall =
    balancesCallsType?.type.def.asVariant?.variants.find((variant) =>
      variant.name.eq("transfer")
    ) !== undefined

  return hasDeprecatedTransferCall ? "transfer" : "transferAllowDeath"
}
