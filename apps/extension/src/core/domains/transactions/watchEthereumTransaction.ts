import { settingsStore } from "@core/domains/app"
import { addEvmTransaction, updateTransactionStatus } from "@core/domains/transactions/helpers"
import { log } from "@core/log"
import { chaindataProvider } from "@core/rpcs/chaindata"
import * as Sentry from "@sentry/browser"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { ethers } from "ethers"
import { nanoid } from "nanoid"
import urlJoin from "url-join"

import { createNotification } from "../../notifications/createNotification"
import { getProviderForEthereumNetwork } from "../ethereum/rpcProviders"
import { WatchTransactionOptions } from "./types"

export const watchEthereumTransaction = async (
  ethChainId: EvmNetworkId,
  txHash: string,
  unsigned: ethers.providers.TransactionRequest,
  options: WatchTransactionOptions = {}
) => {
  try {
    const { siteUrl, notifications } = options
    const withNotifications = !!(notifications && (await settingsStore.get("allowNotifications")))

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
    if (withNotifications) await createNotification("submitted", networkName, txUrl)

    try {
      await addEvmTransaction(txHash, unsigned, { siteUrl })

      const receipt = await provider.waitForTransaction(txHash)

      // status 0 = error
      // status 1 = ok
      // easy to test on busy AMM pools with a 0.05% slippage limit
      // TODO are there other statuses ? one for replaced maybe ?
      if (receipt.status === undefined || ![0, 1].includes(receipt.status))
        log.warn("Unknown evm tx status", receipt)
      updateTransactionStatus(txHash, receipt.status ? "success" : "error", receipt.blockNumber)

      // success if associated to a block number
      if (withNotifications)
        await createNotification(
          receipt.blockNumber && receipt.status ? "success" : "error",
          networkName,
          txUrl
        )
    } catch (err) {
      updateTransactionStatus(txHash, "unknown")

      if (withNotifications) await createNotification("error", networkName, txUrl, err as Error)
      // eslint-disable-next-line no-console
      else console.error("Failed to watch transaction", { err })
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { ethChainId } })
  }
}
