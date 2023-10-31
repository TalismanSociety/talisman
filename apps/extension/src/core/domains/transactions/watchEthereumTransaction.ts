import { settingsStore } from "@core/domains/app"
import { addEvmTransaction, updateTransactionStatus } from "@core/domains/transactions/helpers"
import { createNotification } from "@core/notifications"
import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import { chaindataProvider } from "@core/rpcs/chaindata"
import * as Sentry from "@sentry/browser"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { nanoid } from "nanoid"
import urlJoin from "url-join"
import { TransactionRequest } from "viem"

import { WatchTransactionOptions } from "./types"

export const watchEthereumTransaction = async (
  evmNetworkId: EvmNetworkId,
  hash: `0x${string}`,
  unsigned: TransactionRequest<string>,
  options: WatchTransactionOptions = {}
) => {
  try {
    const { siteUrl, notifications, transferInfo = {} } = options
    const withNotifications = !!(notifications && (await settingsStore.get("allowNotifications")))

    const ethereumNetwork = await chaindataProvider.getEvmNetwork(evmNetworkId)
    if (!ethereumNetwork) throw new Error(`Could not find ethereum network ${evmNetworkId}`)

    const client = await chainConnectorEvm.getPublicClientForEvmNetwork(evmNetworkId)
    if (!client) throw new Error(`No client for network ${evmNetworkId} (${ethereumNetwork.name})`)

    const networkName = ethereumNetwork.name ?? "unknown network"
    const txUrl = ethereumNetwork.explorerUrl
      ? urlJoin(ethereumNetwork.explorerUrl, "tx", hash)
      : nanoid()

    // PENDING
    if (withNotifications) await createNotification("submitted", networkName, txUrl)

    try {
      await addEvmTransaction(evmNetworkId, hash, unsigned, { siteUrl, ...transferInfo })

      const receipt = await client.waitForTransactionReceipt({
        hash,
      })

      // to test failing transactions, swap on busy AMM pools with a 0.05% slippage limit
      updateTransactionStatus(
        hash,
        receipt.status === "success" ? "success" : "error",
        receipt.blockNumber
      )

      // success if associated to a block number
      if (withNotifications)
        await createNotification(
          receipt.blockNumber && receipt.status ? "success" : "error",
          networkName,
          txUrl
        )
    } catch (err) {
      updateTransactionStatus(hash, "error")

      if (withNotifications) await createNotification("error", networkName, txUrl, err as Error)
      // eslint-disable-next-line no-console
      else console.error("Failed to watch transaction", { err })
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { ethChainId: evmNetworkId } })
  }
}
