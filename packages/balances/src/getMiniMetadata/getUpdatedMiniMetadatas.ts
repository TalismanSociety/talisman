import { ChainConnector } from "@talismn/chain-connector"
import { ChaindataProvider, DotNetworkId } from "@talismn/chaindata-provider"

import { db } from "../TalismanBalancesDatabase"
import { MiniMetadata } from "../types"
import { getMiniMetadatas } from "./getMiniMetadatas"

export const getUpdatedMiniMetadatas = async (
  chainConnector: ChainConnector,
  chaindataProvider: ChaindataProvider,
  chainId: DotNetworkId,
  specVersion: number,
  signal?: AbortSignal,
): Promise<MiniMetadata[]> => {
  const miniMetadatas = await getMiniMetadatas(
    chainConnector,
    chaindataProvider,
    chainId,
    specVersion,
    signal,
  )

  signal?.throwIfAborted()

  await db.transaction("readwrite", "miniMetadatas", async (tx) => {
    await tx.miniMetadatas.where({ chainId }).delete()
    await tx.miniMetadatas.bulkPut(miniMetadatas)
  })

  return miniMetadatas
}
