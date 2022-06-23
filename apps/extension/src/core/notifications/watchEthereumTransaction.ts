import Browser from "webextension-polyfill"
import { getProviderForEthereumNetwork } from "../domains/ethereum/networksStore"
import { nanoid } from "nanoid"
import * as Sentry from "@sentry/browser"
import urlJoin from "url-join"
import { createNotification } from "./createNotification"
import { db } from "@core/libs/db"

export const watchEthereumTransaction = async (ethChainId: number, txHash: string) => {
  try {
    // eslint-disable-next-line no-var
    var ethereumNetwork = await db.evmNetworks.get(ethChainId)
    if (!ethereumNetwork) {
      throw new Error(`Could not find ethereum network ${ethChainId}`)
    }

    const provider = getProviderForEthereumNetwork(ethereumNetwork)
    if (!provider) {
      throw new Error(`No provider for network ${ethChainId} (${ethereumNetwork.name})`)
    }

    const txUrl = ethereumNetwork.explorerUrl
      ? urlJoin(ethereumNetwork.explorerUrl, "tx", txHash)
      : nanoid()

    // PENDING
    await createNotification("submitted", ethereumNetwork.name!, txUrl)

    try {
      const receipt = await provider.waitForTransaction(txHash)

      // success if associated to a block number
      await createNotification(
        receipt.blockNumber ? "success" : "error",
        ethereumNetwork.name!,
        txUrl
      )
    } catch (err) {
      await createNotification("error", ethereumNetwork.name!, txUrl, err as Error)
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { ethChainId } })
  }
}
