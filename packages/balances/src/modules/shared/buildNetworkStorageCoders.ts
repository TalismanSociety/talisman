import type { DotNetworkId } from "@talismn/chaindata-provider"
import type { ScaleStorageCoder } from "@talismn/scale"

import type { MiniMetadata } from "../../types"
import { getCachedScaleBuilder, getCachedStorageCoder } from "./scaleBuilderCache"

type NetworkCoders = { [key: string]: [string, string] }

type NetworkStorageCoders<TCoders extends NetworkCoders> = {
  [Property in keyof TCoders]: ScaleStorageCoder | undefined
}

export const buildNetworkStorageCoders = <TCoders extends { [key: string]: [string, string] }>(
  chainId: DotNetworkId,
  miniMetadata: MiniMetadata,
  coders: TCoders
): NetworkStorageCoders<TCoders> | null => {
  if (!miniMetadata.data) return null

  // metadata parse + builder + per-entry coders are all memoized (see scaleBuilderCache):
  // the expensive work runs once per (module, chain, specVersion) instead of per rebuild
  if (getCachedScaleBuilder(miniMetadata) === null) return null

  return Object.fromEntries(
    Object.entries(coders).map(
      ([key, moduleMethodOrFn]: [
        keyof TCoders,
        [string, string] | ((params: { chainId: string }) => [string, string]),
      ]) => {
        const [module, method] =
          typeof moduleMethodOrFn === "function" ? moduleMethodOrFn({ chainId }) : moduleMethodOrFn
        return [key, getCachedStorageCoder(miniMetadata, module, method)] as const
      }
    )
  ) as NetworkStorageCoders<TCoders>
}
