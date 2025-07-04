import { ChainConnector } from "@talismn/chain-connector"
import { ChaindataProvider, NetworkId as DotNetworkId } from "@talismn/chaindata-provider"

import log from "../log"
import { AnyNewBalanceModule } from "../modules"
import { db } from "../TalismanBalancesDatabase"
import { deriveMiniMetadataId, MiniMetadata } from "../types"
import { MINIMETADATA_VERSION } from "../version"
import { getSpecVersion } from "./getSpecVersion"
import { getUpdatedMiniMetadatas } from "./getUpdatedMiniMetadatas"

export const getMiniMetadata = async <T extends AnyNewBalanceModule>(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  chainId: DotNetworkId,
  source: string,
  signal?: AbortSignal,
): Promise<MiniMetadata<T>> => {
  const specVersion = await getSpecVersion(chainConnector, chainId)

  signal?.throwIfAborted()

  const miniMetadataId = deriveMiniMetadataId({
    source,
    chainId,
    specVersion,
  })

  // lookup local ones
  const [dbMiniMetadata, ghMiniMetadata] = await Promise.all([
    db.miniMetadatas.get(miniMetadataId),
    chaindataProvider.miniMetadataById(miniMetadataId),
  ])

  signal?.throwIfAborted()

  const miniMetadata = dbMiniMetadata ?? ghMiniMetadata
  if (miniMetadata) return miniMetadata

  // update from live chain metadata and persist locally
  const miniMetadatas = await getUpdatedMiniMetadatas(
    chainConnector,
    chaindataProvider,
    chainId,
    specVersion,
    signal,
  )

  signal?.throwIfAborted()

  const found = miniMetadatas.find((m) => m.id === miniMetadataId)
  if (!found) {
    log.warn("MiniMetadata not found in updated miniMetadatas", {
      source,
      chainId,
      specVersion,
      version: MINIMETADATA_VERSION,
      miniMetadataId,
      miniMetadatas,
    })
    throw new Error(`MiniMetadata not found for ${source} on ${chainId}`)
  }

  return found
}
