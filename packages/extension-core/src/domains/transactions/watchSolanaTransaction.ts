import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js"
import { getBlockExplorerUrls, SolNetworkId } from "@talismn/chaindata-provider"
import { parseTransactionInfo } from "@talismn/solana"
import { log } from "extension-shared"

import { sentry } from "../../config/sentry"
import { createNotification } from "../../notifications"
import { chainConnectorSol } from "../../rpcs/chain-connector-sol"
import { chaindataProvider } from "../../rpcs/chaindata"
import { addSolTransaction, updateTransactionStatus } from "./helpers"
import { TransactionStatus, WatchTransactionOptions } from "./types"

export const watchSolanaTransaction = async (
  networkId: SolNetworkId,
  transaction: Transaction | VersionedTransaction,
  options: WatchTransactionOptions = {},
) => {
  try {
    const { siteUrl, notifications, txInfo } = options

    const network = await chaindataProvider.getNetworkById(networkId, "solana")
    if (!network) throw new Error(`Could not find ethereum network ${networkId}`)

    const connection = await chainConnectorSol.getConnection(networkId)
    if (!connection) throw new Error(`No connection for network ${networkId} (${network.name})`)

    const { signature } = parseTransactionInfo(transaction)
    if (!signature) throw new Error("Transaction does not have a signature")

    const blockExplorerUrls = getBlockExplorerUrls(network, { type: "transaction", id: signature })
    const txUrl = blockExplorerUrls[0] ?? chrome.runtime.getURL("dashboard.html#/tx-history")

    await addSolTransaction(networkId, transaction, { siteUrl, txInfo })

    watchUntilFinalized(connection, signature, network.name, notifications ? txUrl : undefined)
  } catch (err) {
    log.error("Failed to watch Solana transaction (outer)", { err, networkId, transaction })
    sentry.captureException(err, { tags: { networkId } })
  }
}
// Helper function to poll for transaction confirmation
async function watchUntilFinalized(
  connection: Connection,
  signature: string,
  networkName: string,
  notificationTxUrl?: string,
  maxRetries = 30,
  intervalMs = 2000,
) {
  let txStatus: TransactionStatus = "pending"

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check if transaction is confirmed
      const status = await connection.getSignatureStatus(signature)
      const { confirmationStatus, err } = status?.value ?? {}

      // TODO ideally we should check that the current block height (which is not the slot) is still < lastValidBlockHeight
      // but that would be one additional RPC call per poll

      if (err) {
        txStatus = "error"
        await updateTransactionStatus(signature, txStatus)
        if (notificationTxUrl) await createNotification("error", networkName, notificationTxUrl)
        return // we re done
      } else if (confirmationStatus === "confirmed" && txStatus !== "success") {
        txStatus = "success"

        const txDetails = await tryGetTransactionDetails(connection, signature)
        await updateTransactionStatus(signature, txStatus, txDetails?.slot)

        if (notificationTxUrl) await createNotification("success", networkName, notificationTxUrl)

        // continue polling until finalized
      } else if (confirmationStatus === "finalized") {
        const txDetails = await tryGetTransactionDetails(connection, signature)
        await updateTransactionStatus(signature, txStatus, txDetails?.slot, true)
        return // we re done
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    } catch (error) {
      if (i === maxRetries - 1) {
        await updateTransactionStatus(signature, "unknown")
        return
      }
      // Continue polling on transient errors
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  // timeout
  await updateTransactionStatus(signature, "unknown")
}

const tryGetTransactionDetails = async (connection: Connection, signature: string) => {
  try {
    return await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    })
  } catch (error) {
    log.error("Failed to get transaction details", { error, signature })
    return null
  }
}
