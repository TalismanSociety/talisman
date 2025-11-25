import { assert } from "@polkadot/util"
import { getBlockExplorerUrls, NetworkId } from "@talismn/chaindata-provider"
import { sleep, throwAfter } from "@talismn/util"
import { Hex, TransactionReceipt, TransactionRequest } from "viem"

import { sentry } from "../../config/sentry"
import { createNotification } from "../../notifications"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chaindataProvider } from "../../rpcs/chaindata"
import { settingsStore } from "../app/store.settings"
import { assetDiscoveryScanner } from "../assetDiscovery/scanner"
import { resetTransactionCount } from "../ethereum/transactionCountManager"
import { addEvmTransaction, updateTransactionStatus } from "./helpers"
import { WatchTransactionOptions } from "./types"

export const watchEthereumTransaction = async (
  evmNetworkId: NetworkId,
  hash: `0x${string}`,
  unsigned: TransactionRequest<string>,
  options: WatchTransactionOptions = {},
) => {
  try {
    const { siteUrl, notifications, txInfo } = options
    const withNotifications = !!(notifications && (await settingsStore.get("allowNotifications")))

    const ethereumNetwork = await chaindataProvider.getNetworkById(evmNetworkId, "ethereum")
    if (!ethereumNetwork) throw new Error(`Could not find ethereum network ${evmNetworkId}`)

    const client = await chainConnectorEvm.getPublicClientForEvmNetwork(evmNetworkId)
    if (!client) throw new Error(`No client for network ${evmNetworkId} (${ethereumNetwork.name})`)

    const networkName = ethereumNetwork.name ?? "unknown network"
    const blockExplorerUrls = getBlockExplorerUrls(ethereumNetwork, {
      type: "transaction",
      id: hash,
    })
    const txUrl = blockExplorerUrls[0] ?? chrome.runtime.getURL("dashboard.html#/tx-history")

    // PENDING
    if (withNotifications) await createNotification("submitted", networkName, txUrl)

    try {
      await addEvmTransaction(evmNetworkId, hash, unsigned, { siteUrl, txInfo })

      // Observed on polygon network (tried multiple rpcs) that waitForTransactionReceipt throws TransactionNotFoundError & BlockNotFoundError randomly
      // so we retry as long as we don't get a receipt, with a timeout on our side
      const getTransactionReceipt = async (hash: Hex): Promise<TransactionReceipt> => {
        try {
          return await client.waitForTransactionReceipt({ hash, confirmations: 0 })
        } catch (err) {
          await sleep(4000)
          return getTransactionReceipt(hash)
        }
      }

      const receipt = await Promise.race([
        getTransactionReceipt(hash),
        throwAfter(5 * 60_000, "Transaction not found"),
      ])

      assert(receipt, "Transaction not found")
      // check hash which may be incorrect for cancelled tx, in which case receipt includes the replacement tx hash
      if (receipt.transactionHash === hash) {
        // to test failing transactions, swap on busy AMM pools with a 0.05% slippage limit
        updateTransactionStatus(
          hash,
          receipt.status === "success" ? "success" : "error",
          receipt.blockNumber,
        )
      }

      if (withNotifications)
        await createNotification(
          receipt.status === "success" ? "success" : "error",
          networkName,
          txUrl,
        )

      // wait 2 confirmations before marking as confirmed
      if (receipt.status === "success") {
        const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 2 })
        if (receipt.status === "success")
          updateTransactionStatus(
            hash,
            receipt.status === "success" ? "success" : "error",
            receipt.blockNumber,
            true,
          )

        // if tx orignates from a dapp, in case it's a swap for a new token, launch an asset discovery scan
        if (!!siteUrl && !!unsigned.from)
          assetDiscoveryScanner.startScan({
            networkIds: [evmNetworkId],
            addresses: [unsigned.from],
            withApi: false,
          })
      }
    } catch (err) {
      const isNotFound =
        err instanceof Error &&
        (err.message === "Transaction not found" ||
          err.name === "WaitForTransactionReceiptTimeoutError")

      // if not found, mark tx as unknown so user can still cancel/speed-up if necessary
      updateTransactionStatus(hash, isNotFound ? "unknown" : "error")

      // observed on polygon, some submitted transactions are not found, in which case we must reset the nonce counter to avoid being stuck
      if (unsigned.from) resetTransactionCount(unsigned.from, evmNetworkId)

      if (withNotifications)
        await createNotification(
          isNotFound ? "not_found" : "error",
          networkName,
          txUrl,
          err as Error,
        )
      // eslint-disable-next-line no-console
      else console.error("Failed to watch transaction", { err })
    }
  } catch (err) {
    sentry.captureException(err, { tags: { ethChainId: evmNetworkId } })
  }
}
