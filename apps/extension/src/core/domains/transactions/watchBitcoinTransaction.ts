import { log } from "@common/log"
import type { BtcApi } from "@talismn/bitcoin"
import { type BtcNetworkId, getBlockExplorerUrls } from "@talismn/chaindata-provider"

import { sentry } from "../../config/sentry"
import { db } from "../../db"
import { createNotification } from "../../notifications"
import { chainConnectorBtc } from "../../rpcs/chain-connector-btc"
import { chaindataProvider } from "../../rpcs/chaindata"
import { updateTransactionStatus } from "./helpers"
import type { WalletTransactionInfo, WatchTransactionOptions } from "./types"
import { watchSwapStatus } from "./watchSwapStatus"

// bitcoin blocks land every ~10 minutes: poll fast at first (mempool acceptance,
// fast blocks), then back off. In-memory watch is capped; the startup resume
// re-attaches to pending rows after a service worker restart.
const FAST_POLL_MS = 20_000
const FAST_POLL_COUNT = 30 // 10 minutes
const SLOW_POLL_MS = 60_000
const SLOW_POLL_COUNT = 50 // + 50 minutes
const NOT_FOUND_GRACE_MS = 120_000
const MAX_NOT_FOUND = 3

export const watchBitcoinTransaction = async (
  networkId: BtcNetworkId,
  txid: string,
  txHex: string,
  account: string,
  options: WatchTransactionOptions = {}
) => {
  try {
    const { siteUrl, notifications, txInfo } = options

    const network = await chaindataProvider.getNetworkById(networkId, "bitcoin")
    if (!network) throw new Error(`Could not find bitcoin network ${networkId}`)

    const api = await chainConnectorBtc.getApi(networkId)

    const blockExplorerUrls = getBlockExplorerUrls(network, { type: "transaction", id: txid })
    const txUrl = blockExplorerUrls[0] ?? chrome.runtime.getURL("dashboard.html#/tx-history")

    await addBtcTransaction(networkId, txid, txHex, account, { siteUrl, txInfo })

    watchUntilConfirmed(api, txid, network.name, notifications ? txUrl : undefined, txInfo)
  } catch (err) {
    log.error("Failed to watch Bitcoin transaction (outer)", { err, networkId, txid })
    sentry.captureException(err, { tags: { networkId } })
  }
}

/**
 * Re-attaches watchers to in-flight bitcoin transactions after a service worker restart.
 * The restart routine marks pending rows "unknown" and only verifies eth/dot/sol — bitcoin
 * rows are reclaimed here.
 */
export const resumePendingBitcoinTransactions = async () => {
  try {
    const inFlight = await db.transactionsV2
      .filter((tx) => tx.platform === "bitcoin" && ["pending", "unknown"].includes(tx.status))
      .toArray()

    for (const tx of inFlight) {
      if (tx.platform !== "bitcoin") continue
      await updateTransactionStatus(tx.id, "pending")
      const api = await chainConnectorBtc.getApi(tx.networkId)
      watchUntilConfirmed(api, tx.hash, tx.networkId, undefined, tx.txInfo)
    }
  } catch (err) {
    log.error("Failed to resume bitcoin transaction watchers", { err })
  }
}

const addBtcTransaction = async (
  networkId: BtcNetworkId,
  txid: string,
  txHex: string,
  account: string,
  options: { siteUrl?: string; txInfo?: WalletTransactionInfo } = {}
) => {
  try {
    // Atomic read+write prevents a concurrent watcher from having its
    // terminal status overwritten back to "pending".
    await db.transaction("rw", db.transactionsV2, async () => {
      const existing = await db.transactionsV2.get(txid)
      if (existing && ["success", "error", "replaced"].includes(existing.status)) return

      await db.transactionsV2.put({
        id: txid,
        platform: "bitcoin",
        networkId,
        account,
        hash: txid,
        payload: txHex,
        status: "pending",
        confirmed: false,
        siteUrl: options.siteUrl,
        label: "Transaction",
        txInfo: options.txInfo,
        timestamp: Date.now(),
      })
    })
  } catch (err) {
    log.error("addBtcTransaction", { err, txid, options })
  }
}

async function watchUntilConfirmed(
  api: BtcApi,
  txid: string,
  networkName: string,
  notificationTxUrl?: string,
  txInfo?: WalletTransactionInfo
) {
  const startedAt = Date.now()
  let notFoundCount = 0

  const totalPolls = FAST_POLL_COUNT + SLOW_POLL_COUNT
  for (let i = 0; i < totalPolls; i++) {
    await new Promise((resolve) =>
      setTimeout(resolve, i < FAST_POLL_COUNT ? FAST_POLL_MS : SLOW_POLL_MS)
    )

    try {
      const status = await api.getTxStatus(txid)
      notFoundCount = 0

      if (status.confirmed) {
        await updateTransactionStatus(txid, "success", status.block_height, true)
        if (notificationTxUrl) await createNotification("success", networkName, notificationTxUrl)
        if (txInfo) watchSwapStatus(txid)
        return
      }
    } catch (err) {
      // 404 after the grace period means the transaction was evicted from the mempool
      const isNotFound = err instanceof Error && /not found/i.test(err.message)
      if (isNotFound && Date.now() - startedAt > NOT_FOUND_GRACE_MS) {
        if (++notFoundCount >= MAX_NOT_FOUND) {
          await updateTransactionStatus(txid, "error")
          if (notificationTxUrl) await createNotification("error", networkName, notificationTxUrl)
          return
        }
      }
      // transient errors: keep polling
    }
  }

  // cap reached without confirmation: leave as pending — slow confirmation is normal on
  // bitcoin, and the startup resume will re-attach a watcher on next SW start
  log.warn("Bitcoin transaction watch cap reached, leaving as pending", { txid })
}
