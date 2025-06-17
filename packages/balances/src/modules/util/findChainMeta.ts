import { DotNetwork } from "@talismn/chaindata-provider"

import { libVersion } from "../../libVersion"
import { deriveMiniMetadataId, MiniMetadata } from "../../types"
import { AnyNewBalanceModule, InferChainMeta, InferModuleType } from "./InferBalanceModuleTypes"

/**
 * Given a `moduleType` and a `chain` from a chaindataProvider, this function will find the chainMeta
 * associated with the given balanceModule for the given chain.
 */
export const findChainMeta = <TBalanceModule extends AnyNewBalanceModule>(
  miniMetadatas: Map<string, MiniMetadata>,
  moduleType: InferModuleType<TBalanceModule>,
  chain?: DotNetwork,
): [InferChainMeta<TBalanceModule> | undefined, MiniMetadata | undefined] => {
  if (!chain) return [undefined, undefined]
  if (!chain.specVersion) return [undefined, undefined]

  // TODO: This is spaghetti to import this here, it should be injected into each balance module or something.
  const metadataId = deriveMiniMetadataId({
    source: moduleType,
    chainId: chain.id,
    specVersion: chain.specVersion,
    libVersion,
  })

  // TODO: Fix this (needs to fetch miniMetadata without being async)
  const miniMetadata = miniMetadatas.get(metadataId)
  const chainMeta: InferChainMeta<TBalanceModule> | undefined = miniMetadata
    ? {
        miniMetadata: miniMetadata.data,
      }
    : undefined

  return [chainMeta, miniMetadata]
}
