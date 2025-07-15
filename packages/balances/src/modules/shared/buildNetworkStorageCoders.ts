import { DotNetworkId } from "@talismn/chaindata-provider"
import {
  decAnyMetadata,
  getDynamicBuilder,
  getLookupFn,
  ScaleStorageCoder,
  unifyMetadata,
} from "@talismn/scale"

import log from "../../log"
import { MiniMetadata } from "../../types"

type NetworkCoders = { [key: string]: [string, string] }

type NetworkStorageCoders<TCoders extends NetworkCoders> = {
  [Property in keyof TCoders]: ScaleStorageCoder | undefined
}

export const buildNetworkStorageCoders = <TCoders extends { [key: string]: [string, string] }>(
  chainId: DotNetworkId,
  miniMetadata: MiniMetadata,
  coders: TCoders,
): NetworkStorageCoders<TCoders> | null => {
  if (!miniMetadata.data) return null

  const metadata = unifyMetadata(decAnyMetadata(miniMetadata.data))

  try {
    const scaleBuilder = getDynamicBuilder(getLookupFn(metadata))
    const builtCoders = Object.fromEntries(
      Object.entries(coders).flatMap(
        ([key, moduleMethodOrFn]: [
          keyof TCoders,
          [string, string] | ((params: { chainId: string }) => [string, string]),
        ]) => {
          const [module, method] =
            typeof moduleMethodOrFn === "function"
              ? moduleMethodOrFn({ chainId })
              : moduleMethodOrFn
          try {
            return [[key, scaleBuilder.buildStorage(module, method)] as const]
          } catch (cause) {
            log.trace(
              `Failed to build SCALE coder for chain ${chainId} (${module}::${method})`,
              cause,
            )
            return []
          }
        },
      ),
    ) as {
      [Property in keyof TCoders]: ReturnType<(typeof scaleBuilder)["buildStorage"]> | undefined
    }

    return builtCoders
  } catch (cause) {
    log.error(
      `Failed to build SCALE coders for chain ${chainId} (${JSON.stringify(coders)})`,
      cause,
    )
  }

  return null
}
