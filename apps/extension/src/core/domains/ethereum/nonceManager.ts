import type { EthNetworkId } from "@talismn/chaindata-provider"

import { db } from "../../db"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { cleanupDroppedEvmTransactions } from "../transactions/cleanupDroppedTransactions"

// Tracks all nonces handed out per address:network that may not be persisted
// to Dexie yet. Using a Set prevents concurrent callers from receiving duplicates,
// even when one reservation is released while others are still in flight.
const reservedNonces = new Map<string, Set<number>>()

// Promise-chain mutex per address:network — serializes getNextNonce calls
// so concurrent requests don't interleave at await points.
const nonceMutexes = new Map<string, Promise<unknown>>()

/**
 * Releases a specific in-memory nonce reservation for a given address and network.
 * Call this when a transaction fails to send so the nonce can be reused.
 */
export const releaseReservedNonce = (
  address: string,
  evmNetworkId: EthNetworkId,
  nonce: number
): void => {
  const key = `${address.toLowerCase()}:${evmNetworkId}`
  const set = reservedNonces.get(key)
  if (!set) return

  set.delete(nonce)
  if (set.size === 0) reservedNonces.delete(key)
}

/** @internal Clears all in-memory nonce state. Test-only. */
export const _resetNonceState = (): void => {
  reservedNonces.clear()
  nonceMutexes.clear()
}

/**
 * Returns the next nonce to use for a transaction from the given address on the given network.
 *
 * Computes max(onChainNonce, highestLocalPendingNonce + 1, reservedNonce + 1) to ensure:
 * - We never regress below what the chain has confirmed
 * - We account for pending/unknown txs that haven't been mined yet (even across SW restarts)
 * - We don't hand out duplicate nonces to concurrent callers
 *
 * When local nonce exceeds on-chain, verifies that "unknown" txs are still in the mempool.
 * Dropped txs are marked as "error" and excluded from the calculation.
 *
 * Calls are serialized per address:network via an async mutex.
 *
 * @param options.reserve - If true (default), reserves the nonce in memory to prevent
 *   concurrent callers from receiving the same value. Set to false for read-only queries.
 */
export const getNextNonce = async (
  address: `0x${string}`,
  evmNetworkId: EthNetworkId,
  { reserve = true }: { reserve?: boolean } = {}
): Promise<number> => {
  const normalizedAddress = address.toLowerCase()
  const key = `${normalizedAddress}:${evmNetworkId}`

  // Chain onto any pending operation for this address:network
  const prev = nonceMutexes.get(key) ?? Promise.resolve()
  const current = prev.then(
    () => computeNextNonce(address, evmNetworkId, key, reserve),
    () => computeNextNonce(address, evmNetworkId, key, reserve)
  )
  nonceMutexes.set(key, current)

  try {
    return await current
  } finally {
    if (nonceMutexes.get(key) === current) nonceMutexes.delete(key)
  }
}

const computeNextNonce = async (
  address: `0x${string}`,
  evmNetworkId: EthNetworkId,
  key: string,
  reserve: boolean
): Promise<number> => {
  const provider = await chainConnectorEvm.getPublicClientForEvmNetwork(evmNetworkId)
  if (!provider) throw new Error(`Could not find provider for EVM chain ${evmNetworkId}`)

  const normalizedAddress = address.toLowerCase()

  // Fetch on-chain nonce and local pending nonces concurrently
  const [onChainNonce, highestLocalNonce] = await Promise.all([
    provider.getTransactionCount({ address }),
    getHighestLocalNonce(normalizedAddress, evmNetworkId),
  ])

  // Clear stale reservations where the on-chain nonce has advanced past them
  const reservedSet = reservedNonces.get(key)
  if (reservedSet) {
    for (const n of reservedSet) {
      if (onChainNonce > n) reservedSet.delete(n)
    }
    if (reservedSet.size === 0) reservedNonces.delete(key)
  }

  let nextNonce: number

  if (highestLocalNonce === null) {
    nextNonce = onChainNonce
  } else if (highestLocalNonce + 1 > onChainNonce) {
    // If local nonce would push ahead of on-chain, verify unknown txs are still in the mempool
    const cleaned = await cleanupDroppedEvmTransactions(normalizedAddress, evmNetworkId)
    if (cleaned) {
      const updatedHighest = await getHighestLocalNonce(normalizedAddress, evmNetworkId)
      nextNonce =
        updatedHighest === null ? onChainNonce : Math.max(onChainNonce, updatedHighest + 1)
    } else {
      nextNonce = Math.max(onChainNonce, highestLocalNonce + 1)
    }
  } else {
    nextNonce = Math.max(onChainNonce, highestLocalNonce + 1)
  }

  // Ensure we don't hand out a nonce that was already reserved in-memory
  const currentReservedSet = reservedNonces.get(key)
  if (currentReservedSet && currentReservedSet.size > 0) {
    const highestReserved = Math.max(...currentReservedSet)
    if (highestReserved >= nextNonce) {
      nextNonce = highestReserved + 1
    }
  }

  if (reserve) {
    const set = reservedNonces.get(key) ?? new Set<number>()
    set.add(nextNonce)
    reservedNonces.set(key, set)
  }

  return nextNonce
}

/**
 * Finds the highest nonce among pending/unknown EVM transactions for a given address+network.
 * Uses the existing Dexie `status` index for efficient querying.
 */
const getHighestLocalNonce = async (
  address: string,
  evmNetworkId: EthNetworkId
): Promise<number | null> => {
  const normalizedAddress = address.toLowerCase()

  const pendingTxs = await db.transactionsV2
    .where("status")
    .anyOf("pending", "unknown")
    .filter(
      (tx) =>
        tx.platform === "ethereum" &&
        tx.networkId === evmNetworkId &&
        tx.account.toLowerCase() === normalizedAddress
    )
    .toArray()

  if (pendingTxs.length === 0) return null

  let highest = -1
  for (const tx of pendingTxs) {
    if (tx.platform !== "solana" && typeof tx.nonce === "number" && tx.nonce > highest) {
      highest = tx.nonce
    }
  }

  return highest === -1 ? null : highest
}
