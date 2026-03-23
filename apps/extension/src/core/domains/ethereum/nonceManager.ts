import type { EthNetworkId } from "@talismn/chaindata-provider"

import { db } from "../../db"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { cleanupDroppedEvmTransactions } from "../transactions/cleanupDroppedTransactions"

/**
 * Returns the next nonce to use for a transaction from the given address on the given network.
 *
 * Computes max(onChainNonce, highestLocalPendingNonce + 1) to ensure:
 * - We never regress below what the chain has confirmed
 * - We account for pending/unknown txs that haven't been mined yet (even across SW restarts)
 *
 * When local nonce exceeds on-chain, verifies that "unknown" txs are still in the mempool.
 * Dropped txs are marked as "error" and excluded from the calculation.
 */
export const getNextNonce = async (
  address: `0x${string}`,
  evmNetworkId: EthNetworkId
): Promise<number> => {
  const provider = await chainConnectorEvm.getPublicClientForEvmNetwork(evmNetworkId)
  if (!provider) throw new Error(`Could not find provider for EVM chain ${evmNetworkId}`)

  const normalizedAddress = address.toLowerCase()

  // Fetch on-chain nonce and local pending nonces concurrently
  const [onChainNonce, highestLocalNonce] = await Promise.all([
    provider.getTransactionCount({ address }),
    getHighestLocalNonce(normalizedAddress, evmNetworkId),
  ])

  if (highestLocalNonce === null) return onChainNonce

  // If local nonce would push ahead of on-chain, verify unknown txs are still in the mempool
  if (highestLocalNonce + 1 > onChainNonce) {
    const cleaned = await cleanupDroppedEvmTransactions(normalizedAddress, evmNetworkId)
    if (cleaned) {
      const updatedHighest = await getHighestLocalNonce(normalizedAddress, evmNetworkId)
      if (updatedHighest === null) return onChainNonce
      return Math.max(onChainNonce, updatedHighest + 1)
    }
  }

  return Math.max(onChainNonce, highestLocalNonce + 1)
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
