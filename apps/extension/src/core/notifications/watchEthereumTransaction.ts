import { db } from "@core/libs/db"
import * as Sentry from "@sentry/browser"
import { nanoid } from "nanoid"
import urlJoin from "url-join"

import { getProviderForEthereumNetwork } from "../domains/ethereum/rpcProviders"
import { createNotification } from "./createNotification"

export const watchEthereumTransaction = async (ethChainId: number, txHash: string) => {
  try {
    const ethereumNetwork = await db.evmNetworks.get(ethChainId)
    if (!ethereumNetwork) {
      throw new Error(`Could not find ethereum network ${ethChainId}`)
    }
    const networkName = ethereumNetwork.name ?? "unknown network"

    const provider = await getProviderForEthereumNetwork(ethereumNetwork, { batch: true })
    if (!provider) {
      throw new Error(`No provider for network ${ethChainId} (${ethereumNetwork.name})`)
    }

    const txUrl = ethereumNetwork.explorerUrl
      ? urlJoin(ethereumNetwork.explorerUrl, "tx", txHash)
      : nanoid()

    // PENDING
    await createNotification("submitted", networkName, txUrl)

    try {
      const receipt = await provider.waitForTransaction(txHash)

      // success if associated to a block number
      await createNotification(receipt.blockNumber ? "success" : "error", networkName, txUrl)
    } catch (err) {
      await createNotification("error", networkName, txUrl, err as Error)
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { ethChainId } })
  }
}
