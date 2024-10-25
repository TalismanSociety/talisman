import { ChainId, ChainList } from "@talismn/chaindata-provider"
import { decodeMetadata, getDynamicBuilder, getLookupFn } from "@talismn/scale"

import log from "../../log"
import { MiniMetadata } from "../../types"
import { findChainMeta } from "./findChainMeta"
import { AnyNewBalanceModule, InferModuleType } from "./InferBalanceModuleTypes"

export type StorageCoders<TCoders extends { [key: string]: [string, string] }> = Map<
  string,
  {
    [Property in keyof TCoders]:
      | ReturnType<ReturnType<typeof getDynamicBuilder>["buildStorage"]>
      | undefined
  }
>

export const buildStorageCoders = <
  TBalanceModule extends AnyNewBalanceModule,
  TCoders extends { [key: string]: [string, string] },
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

      const { metadata, tag } = decodeMetadata(miniMetadata.data)
      if (!metadata || !tag) return []

      try {
        const scaleBuilder = getDynamicBuilder(getLookupFn(metadata))
        const builtCoders = Object.fromEntries(
          Object.entries(coders).flatMap(
            ([key, [module, method]]: [keyof TCoders, [string, string]]) => {
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

        return [[chainId, builtCoders]]
      } catch (cause) {
        log.error(
          `Failed to build SCALE coders for chain ${chainId} (${JSON.stringify(coders)})`,
          cause,
        )
        return []
      }
    }),
  )
