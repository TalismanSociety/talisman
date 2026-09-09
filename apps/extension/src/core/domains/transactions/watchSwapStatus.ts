import { log } from "@common/log"
import { networkIdFromTokenId } from "@talismn/chaindata-provider"
import { sleep } from "@talismn/util"
import { db } from "../../db"
import { remoteConfigStore } from "../app/store.remoteConfig"
import {
  fetchForevermoneyStatus,
  isForevermoneyDeliveryExpired,
} from "../forevermoney/deliveryStatus"
import { isTxInfoSwap, updateSwapStatus } from "./helpers"
import {
  FINAL_SWAP_STATUSES,
  type SwapStatus,
  type WalletTransaction,
  type WalletTransactionInfo,
} from "./types"

const POLL_INTERVAL_MS = 20_000
const MAX_RETRIES = 10
const RETRY_DELAY_MS = 5_000
const NOT_FOUND_GRACE_PERIOD_MS = 10 * 60 * 1_000 // 10 minutes
const UNKNOWN_MAX_AGE_MS = 60 * 60 * 1_000 // 1 hour

// Track active watchers to prevent duplicate polling for the same transaction.
const activeWatchers = new Set<string>()

// a failed CCIP delivery can be executed again manually, so it stays open until the delivery window closes
const isFinalSwapStatus = (tx: WalletTransaction, status: SwapStatus) => {
  if (!FINAL_SWAP_STATUSES.includes(status)) return false
  if (tx.txInfo?.type === "swap-forevermoney" && status === "failed")
    return isForevermoneyDeliveryExpired(tx)
  return true
}

/**
 * Start polling the exchange API for swap status updates.
 *
 * Call this after the on-chain transaction reaches "success" for swap-type transactions.
 * The watcher polls every 20s, writes status to the DB, and stops on a terminal status.
 */
export const watchSwapStatus = async (txId: string): Promise<void> => {
  if (activeWatchers.has(txId)) return
  activeWatchers.add(txId)

  try {
    const tx = await db.transactionsV2.get(txId)
    if (!tx?.txInfo || !isTxInfoSwap(tx.txInfo)) return

    // bittensor-staking is purely on-chain — no exchange status to track
    if (tx.txInfo.type === "bittensor-staking") return

    // Already in a terminal state — nothing to do
    if (tx.swapStatus && isFinalSwapStatus(tx, tx.swapStatus)) return

    await pollSwapStatus(tx, tx.txInfo)
  } catch (err) {
    log.error("watchSwapStatus", { err, txId })
  } finally {
    activeWatchers.delete(txId)
  }
}

async function pollSwapStatus(tx: WalletTransaction, txInfo: WalletTransactionInfo): Promise<void> {
  const txId = tx.id
  let notFoundSince: number | null = null

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const status = await fetchSwapStatusWithRetry(txId, txInfo)
    if (status === undefined) {
      // All retries exhausted — mark as unknown so the UI can show an appropriate state
      await updateSwapStatus(txId, "unknown")
      return
    }

    await updateSwapStatus(txId, status)

    if (isFinalSwapStatus(tx, status)) return

    // Allow a grace period for not_found — the tx may still be in the mempool
    if (status === "not_found") {
      notFoundSince ??= Date.now()
      if (Date.now() - notFoundSince >= NOT_FOUND_GRACE_PERIOD_MS) {
        // Giving up — mark as unknown so the UI stops showing an active deposit
        await updateSwapStatus(txId, "unknown")
        return
      }
    } else {
      notFoundSince = null
    }

    await sleep(POLL_INTERVAL_MS)
  }
}

async function fetchSwapStatusWithRetry(
  txId: string,
  txInfo: WalletTransactionInfo
): Promise<SwapStatus | undefined> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchSwapStatus(txId, txInfo)
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        log.error(`Failed to fetch swap status after ${MAX_RETRIES} retries`, { err, txId })
        return undefined
      }
      await sleep(RETRY_DELAY_MS)
    }
  }
  return undefined
}

async function fetchSwapStatus(txId: string, txInfo: WalletTransactionInfo): Promise<SwapStatus> {
  switch (txInfo.type) {
    case "swap-simpleswap":
      return fetchSimpleswapStatus(txInfo.exchangeId)
    case "swap-stealthex":
      return fetchStealthexStatus(txInfo.exchangeId)
    case "swap-lifi":
      return fetchLifiStatus(txId, txInfo)
    case "swap-bittensor-evm":
      return fetchBittensorEvmStatus(txId)
    case "swap-forevermoney":
      return fetchForevermoneyStatusForTx(txId, txInfo)
    default:
      return "unknown"
  }
}

// --- Provider-specific fetchers (simple fetch wrappers, no SDK dependency) ---

async function fetchForevermoneyStatusForTx(
  txId: string,
  txInfo: Extract<WalletTransactionInfo, { type: "swap-forevermoney" }>
): Promise<SwapStatus> {
  const tx = await db.transactionsV2.get(txId)
  if (!tx) return "not_found"
  return fetchForevermoneyStatus(tx, txInfo)
}

// a watcher that died before confirming leaves the transfer unconfirmed forever, so past this age
// the initial on-chain success stands
const NATIVE_TRANSFER_CONFIRMATION_GRACE_MS = 10 * 60 * 1_000

// native chain transfer: complete once the on-chain transfer is confirmed, failed if it got reverted
async function fetchBittensorEvmStatus(txId: string): Promise<SwapStatus> {
  const tx = await db.transactionsV2.get(txId)
  if (!tx) return "not_found"

  switch (tx.status) {
    case "success":
      if (tx.confirmed) return "finished"
      return Date.now() - tx.timestamp >= NATIVE_TRANSFER_CONFIRMATION_GRACE_MS
        ? "finished"
        : "confirming"
    case "error":
    case "replaced":
      return "failed"
    default:
      return "confirming"
  }
}

async function fetchSimpleswapStatus(exchangeId: string): Promise<SwapStatus> {
  const { simpleswapApiKey } = await remoteConfigStore.get("swaps")
  if (!simpleswapApiKey) throw new Error("SimpleSwap API key not found")

  const params = new URLSearchParams({ api_key: simpleswapApiKey, id: exchangeId })
  const res = await fetch(`https://api.simpleswap.io/get_exchange?${params}`)
  if (!res.ok) throw new Error(`SimpleSwap API error: ${res.status}`)

  const data: { status: string } = await res.json()
  return data.status as SwapStatus
}

async function fetchStealthexStatus(exchangeId: string): Promise<SwapStatus> {
  const res = await fetch(`https://stealthex.talisman.xyz/v4/exchanges/${exchangeId}`)
  if (!res.ok) throw new Error(`StealthEX API error: ${res.status}`)

  const data: { status: string } = await res.json()
  return data.status as SwapStatus
}

const LIFI_STATUS_MAP: Record<string, SwapStatus> = {
  NOT_FOUND: "not_found",
  INVALID: "invalid",
  PENDING: "exchanging",
  DONE: "finished",
  FAILED: "failed",
}

async function fetchLifiStatus(
  txId: string,
  txInfo: Extract<WalletTransactionInfo, { type: "swap-lifi" }>
): Promise<SwapStatus> {
  const fromNetworkId = networkIdFromTokenId(txInfo.fromTokenId)
  const toNetworkId = networkIdFromTokenId(txInfo.toTokenId)

  const fromChain = await toLifiChainId(fromNetworkId)
  const toChain = await toLifiChainId(toNetworkId)

  // txId is the on-chain transaction hash (the DB primary key)
  const params = new URLSearchParams({ txHash: txId })
  if (fromChain !== undefined) params.set("fromChain", String(fromChain))
  if (toChain !== undefined) params.set("toChain", String(toChain))

  const res = await fetch(`https://lifi.talisman.xyz/v1/status?${params}`)
  if (!res.ok) throw new Error(`LiFi API error: ${res.status}`)

  const data: { status: string } = await res.json()
  return LIFI_STATUS_MAP[data.status] ?? "unknown"
}

async function toLifiChainId(networkId: string): Promise<number | undefined> {
  if (networkId === "solana-mainnet") {
    const { lifi } = await remoteConfigStore.get("swaps")
    return lifi.solanaChainId
  }
  const num = Number(networkId)
  return Number.isFinite(num) ? num : undefined
}

/**
 * Resume swap status watchers for any transactions that were being watched
 * when the service worker last shut down.
 */
export const resumeSwapWatchers = async () => {
  try {
    const now = Date.now()

    const successSwaps = await db.transactionsV2
      .where("status")
      .equals("success")
      .filter((tx) => {
        if (!tx.txInfo || !isTxInfoSwap(tx.txInfo)) return false
        if (tx.txInfo.type === "bittensor-staking") return false
        // Resume if swapStatus hasn't reached a terminal state
        return !tx.swapStatus || !isFinalSwapStatus(tx, tx.swapStatus)
      })
      .toArray()

    let resumed = 0
    for (const tx of successSwaps) {
      // Watcher died before giving up on a missing exchange status — mark as unknown
      // so the UI stops showing an active deposit
      if (tx.swapStatus === "not_found" && now - tx.timestamp >= NOT_FOUND_GRACE_PERIOD_MS) {
        await updateSwapStatus(tx.id, "unknown")
        continue
      }

      // Don't resume unknown watchers past the max age
      if (tx.swapStatus === "unknown" && now - tx.timestamp >= UNKNOWN_MAX_AGE_MS) continue

      // Fire-and-forget — each watcher runs independently
      watchSwapStatus(tx.id)
      resumed++
    }

    if (resumed > 0) log.debug(`[resumeSwapWatchers] Resumed ${resumed} swap watcher(s)`)
  } catch (err) {
    log.error("resumeSwapWatchers", { err })
  }
}
