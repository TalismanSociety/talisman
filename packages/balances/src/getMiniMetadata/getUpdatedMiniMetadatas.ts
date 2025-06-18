import { ChainConnector } from "@talismn/chain-connector"
import { ChaindataProvider, DotNetworkId } from "@talismn/chaindata-provider"

import { db } from "../TalismanBalancesDatabase"
import { MiniMetadata } from "../types"
import { getMiniMetadatas } from "./getMiniMetadatas"

export const getUpdatedMiniMetadatas = async (
  chainConnector: ChainConnector,
  chaindataProvider: ChaindataProvider,
  networkId: DotNetworkId,
  specVersion: number,
): Promise<MiniMetadata[]> => {
  const miniMetadatas = await getMiniMetadatas(
    chainConnector,
    chaindataProvider,
    networkId,
    specVersion,
  )

  await db.transaction("readwrite", "miniMetadatas", async (tx) => {
    await tx.miniMetadatas.where({ networkId }).delete()
    await tx.miniMetadatas.bulkPut(miniMetadatas)
  })

  return miniMetadatas
}
