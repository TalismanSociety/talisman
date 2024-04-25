import { ChainId, ChainList } from "@talismn/chaindata-provider"
import { V14, V15, getDynamicBuilder, metadata as scaleMetadata } from "@talismn/scale"

import log from "../../log"
import { MiniMetadata } from "../../types"
import { findChainMeta } from "./findChainMeta"
import { AnyNewBalanceModule, InferModuleType } from "./InferBalanceModuleTypes"

export const buildStorageCoders = <
  TBalanceModule extends AnyNewBalanceModule,
  TCoders extends { [key: string]: [string, string] }
>({
  chainIds,
  chains,
  miniMetadatas,
  moduleType,
  coders,
}: {
  chainIds: ChainId[]
  chains: ChainList
  miniMetadatas: Map<string, MiniMetadata>
  moduleType: InferModuleType<TBalanceModule>
  coders: TCoders
}) =>
  new Map(
    [...chainIds].flatMap((chainId) => {
      const chain = chains[chainId]
      if (!chain) return []

      const [, miniMetadata] = findChainMeta<TBalanceModule>(miniMetadatas, moduleType, chain)
      if (!miniMetadata) return []
      if (!miniMetadata.data) return []
      if (miniMetadata.version !== 15 && miniMetadata.version !== 14) return []

      const [metadata, tag] = ((): [V15, "v15"] | [V14, "v14"] | [] => {
        const decoded = scaleMetadata.dec(miniMetadata.data)
        if (decoded.metadata.tag === "v15") return [decoded.metadata.value, decoded.metadata.tag]
        if (decoded.metadata.tag === "v14") return [decoded.metadata.value, decoded.metadata.tag]
        return []
      })()
      if (!metadata || !tag) return []

      try {
        const scaleBuilder = getDynamicBuilder(metadata)
        const builtCoders = Object.fromEntries(
          Object.entries(coders).flatMap(
            ([key, [module, method]]: [keyof TCoders, [string, string]]) => {
              try {
                return [[key, scaleBuilder.buildStorage(module, method)] as const]
              } catch (cause) {
                log.warn(
                  `Failed to build SCALE coder for chain ${chainId} (${module}::${method})`,
                  cause
                )
                return []
              }
            }
          )
        ) as {
          [Property in keyof TCoders]: ReturnType<(typeof scaleBuilder)["buildStorage"]> | undefined
        }

        return [[chainId, builtCoders]]
      } catch (cause) {
        log.error(
          `Failed to build SCALE coders for chain ${chainId} (${JSON.stringify(coders)})`,
          cause
        )
        return []
      }
    })
  )
