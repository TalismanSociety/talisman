import { log } from "@common/log"
import type { Signature } from "@solana/kit"
import type { SolRpc } from "@talismn/chain-connectors"
import { getBlockExplorerUrls, type SolNetworkId } from "@talismn/chaindata-provider"
import { parseTransactionInfo, type SolTransaction } from "@talismn/solana"

import { sentry } from "../../config/sentry"
import { createNotification } from "../../notifications"
import { chainConnectorSol } from "../../rpcs/chain-connector-sol"
import { chaindataProvider } from "../../rpcs/chaindata"
import { addSolTransaction, updateTransactionStatus } from "./helpers"
import type { TransactionStatus, WalletTransactionInfo, WatchTransactionOptions } from "./types"
import { watchSwapStatus } from "./watchSwapStatus"

export const watchSolanaTransaction = async (
  networkId: SolNetworkId,
  transaction: SolTransaction,
  options: WatchTransactionOptions = {}
) => {
  try {
    const { siteUrl, notifications, txInfo } = options

    const network = await chaindataProvider.getNetworkById(networkId, "solana")
    if (!network) throw new Error(`Could not find ethereum network ${networkId}`)

    const rpc = await chainConnectorSol.getRpc(networkId)
    if (!rpc) throw new Error(`No connection for network ${networkId} (${network.name})`)

    const { signature } = parseTransactionInfo(transaction)
    if (!signature) throw new Error("Transaction does not have a signature")

    const blockExplorerUrls = getBlockExplorerUrls(network, { type: "transaction", id: signature })
    const txUrl = blockExplorerUrls[0] ?? chrome.runtime.getURL("dashboard.html#/tx-history")

    await addSolTransaction(networkId, transaction, { siteUrl, txInfo })

    watchUntilFinalized(rpc, signature, network.name, notifications ? txUrl : undefined, txInfo)
  } catch (err) {
    log.error("Failed to watch Solana transaction (outer)", { err, networkId, transaction })
    sentry.captureException(err, { tags: { networkId } })
  }
}
// Helper function to poll for transaction confirmation
async function watchUntilFinalized(
  rpc: SolRpc,
  signature: string,
  networkName: string,
  notificationTxUrl?: string,
  txInfo?: WalletTransactionInfo,
  maxRetries = 30,
  intervalMs = 2000
) {
  let txStatus: TransactionStatus = "pending"

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check if transaction is confirmed
      const status = await rpc.getSignatureStatuses([signature as Signature]).send()
      const { confirmationStatus, err } = status?.value?.[0] ?? {}

      // TODO ideally we should check that the current block height (which is not the slot) is still < lastValidBlockHeight
      // but that would be one additional RPC call per poll

      const isFinalized = confirmationStatus === "finalized"

      if (err) {
        txStatus = "error"
        await updateTransactionStatus(signature, txStatus, undefined, isFinalized)
        if (notificationTxUrl) await createNotification("error", networkName, notificationTxUrl)
        return // we re done
      } else if (isFinalized || confirmationStatus === "confirmed") {
        // the first poll can already report "finalized", so success is reported from here too
        const isFirstInclusion = txStatus !== "success"
        txStatus = "success"

        if (isFirstInclusion || isFinalized) {
          const txDetails = await tryGetTransactionDetails(rpc, signature)
          await updateTransactionStatus(signature, txStatus, txDetails?.slot, isFinalized)
        }

        if (isFirstInclusion) {
          if (notificationTxUrl) await createNotification("success", networkName, notificationTxUrl)

          // Start watching exchange status for swap transactions
          if (txInfo) watchSwapStatus(signature)
        }

        if (isFinalized) return // we re done
        // else continue polling until finalized
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    } catch {
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

const tryGetTransactionDetails = async (rpc: SolRpc, signature: string) => {
  try {
    const txDetails = await rpc
      .getTransaction(signature as Signature, {
        commitment: "confirmed",
        encoding: "base64", // only `slot` is consumed, skip json parsing
        maxSupportedTransactionVersion: 0,
      })
      .send()
    return txDetails ? { ...txDetails, slot: Number(txDetails.slot) } : null
  } catch (error) {
    log.error("Failed to get transaction details", { error, signature })
    return null
  }
}
