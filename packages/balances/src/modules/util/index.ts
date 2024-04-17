import { Metadata, StorageKey, TypeRegistry, decorateStorage } from "@polkadot/types"
import type { Registry } from "@polkadot/types-codec/types"
import { ChainId, ChainList } from "@talismn/chaindata-provider"
import { $metadataV14, getShape } from "@talismn/scale"
import * as $ from "@talismn/subshape-fork"
import camelCase from "lodash/camelCase"

import log from "../../log"
import { MiniMetadata } from "../../types"
import { findChainMeta } from "./findChainMeta"
import { AnyNewBalanceModule, InferModuleType } from "./InferBalanceModuleTypes"

export * from "./InferBalanceModuleTypes"
export * from "./RpcStateQueryHelper"
export * from "./balances"
export * from "./buildStorageCoders"
export * from "./decodeOutput"
export * from "./deriveStatuses"
export * from "./detectTransferMethod"
export * from "./findChainMeta"
export * from "./getUniqueChainIds"
export * from "./makeContractCaller"
export * from "./subscriptionIds"

// TODO: RM
export type GetOrCreateTypeRegistry = (chainId: ChainId, metadataRpc?: `0x${string}`) => Registry

// TODO: RM
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

// TODO: RM
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

// TODO: RM
const subshapeStorageDecoder =
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

// TODO: RM
export const buildStorageDecoders = <
  TBalanceModule extends AnyNewBalanceModule,
  TDecoders extends { [key: string]: [string, string] }
>({
  chainIds,
  chains,
  miniMetadatas,
  moduleType,
  decoders,
}: {
  chainIds: ChainId[]
  chains: ChainList
  miniMetadatas: Map<string, MiniMetadata>
  moduleType: InferModuleType<TBalanceModule>
  decoders: TDecoders
}) =>
  new Map(
    [...chainIds].flatMap((chainId) => {
      const chain = chains[chainId]
      if (!chain) return []

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
