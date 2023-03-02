import { db } from "@core/db"
import { settingsStore } from "@core/domains/app"
import { addEvmTransaction, updateEvmTransaction } from "@core/domains/recentTransactions/helpers"
import { chaindataProvider } from "@core/rpcs/chaindata"
import * as Sentry from "@sentry/browser"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { ethers } from "ethers"
import { nanoid } from "nanoid"
import urlJoin from "url-join"

import { getProviderForEthereumNetwork } from "../domains/ethereum/rpcProviders"
import { createNotification } from "./createNotification"

export const watchEthereumTransaction = async (
  ethChainId: EvmNetworkId,
  txHash: string,
  unsigned: ethers.providers.TransactionRequest,
  siteUrl?: string
) => {
  try {
    const allowNotifications = await settingsStore.get("allowNotifications")

    const ethereumNetwork = await chaindataProvider.getEvmNetwork(ethChainId)
    if (!ethereumNetwork) throw new Error(`Could not find ethereum network ${ethChainId}`)

    const provider = await getProviderForEthereumNetwork(ethereumNetwork, { batch: true })
    if (!provider)
      throw new Error(`No provider for network ${ethChainId} (${ethereumNetwork.name})`)

    const networkName = ethereumNetwork.name ?? "unknown network"
    const txUrl = ethereumNetwork.explorerUrl
      ? urlJoin(ethereumNetwork.explorerUrl, "tx", txHash)
      : nanoid()

    // PENDING
    if (allowNotifications) await createNotification("submitted", networkName, txUrl)

    try {
      await addEvmTransaction(txHash, unsigned, { siteUrl })

      const receipt = await provider.waitForTransaction(txHash)

      // status 0 = error
      // status 1 = ok
      // easy to test on busy AMM pools with a 0.05% slippage limit
      updateEvmTransaction(txHash, {
        status: receipt.status ? "success" : "error",
        blockNumber: receipt.blockNumber?.toString(),
      })

      // success if associated to a block number
      if (allowNotifications)
        await createNotification(
          receipt.blockNumber && receipt.status ? "success" : "error",
          networkName,
          txUrl
        )
    } catch (err) {
      updateEvmTransaction(txHash, { status: "unknown" })

      if (allowNotifications) await createNotification("error", networkName, txUrl, err as Error)
      // eslint-disable-next-line no-console
      else console.error("Failed to watch transaction", { err })
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { ethChainId } })
  }
}
