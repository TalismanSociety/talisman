import { log } from "@common/log"
import type { SolNetworkId } from "@talismn/chaindata-provider"

import { db } from "../../db"
import { chainConnector } from "../../rpcs/chain-connector"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chainConnectorSol } from "../../rpcs/chain-connector-sol"
import { updateTransactionStatus } from "./helpers"
import type { WalletTransactionDot, WalletTransactionEth, WalletTransactionSol } from "./types"

/**
 * Verifies "unknown" transactions against the chain and marks dropped ones as "error".
 *
 * Platform-specific verification:
 * - EVM: eth_getTransactionByHash — not found means dropped
 * - Substrate: system_accountNextIndex — nonce not consumed means dropped
 * - Solana: getSignatureStatuses — null means dropped
 *
 * All checks are fail-safe: RPC errors leave the tx as "unknown".
 */
export const cleanupAllDroppedTransactions = async (): Promise<void> => {
  try {
    const unknownTxs = await db.transactionsV2.where("status").equals("unknown").toArray()
    if (unknownTxs.length === 0) return

    await Promise.allSettled([
      cleanupEvmTransactions(
        unknownTxs.filter((tx): tx is WalletTransactionEth => tx.platform === "ethereum")
      ),
      cleanupSubstrateTransactions(
        unknownTxs.filter((tx): tx is WalletTransactionDot => tx.platform === "polkadot")
      ),
      cleanupSolanaTransactions(
        unknownTxs.filter((tx): tx is WalletTransactionSol => tx.platform === "solana")
      ),
    ])
  } catch (err) {
    log.error("[cleanupAllDroppedTransactions]", { err })
  }
}

/**
 * Verifies unknown EVM transactions for a specific address and network.
 * Called from getNextNonce() when local nonce exceeds on-chain nonce.
 * Returns true if any txs were cleaned up.
 */
export const cleanupDroppedEvmTransactions = async (
  address: string,
  evmNetworkId: string
): Promise<boolean> => {
  const normalizedAddress = address.toLowerCase()

  const unknownTxs = await db.transactionsV2
    .where("status")
    .equals("unknown")
    .filter(
      (tx): tx is WalletTransactionEth =>
        tx.platform === "ethereum" &&
        tx.networkId === evmNetworkId &&
        tx.account.toLowerCase() === normalizedAddress
    )
    .toArray()

  if (unknownTxs.length === 0) return false

  const provider = await chainConnectorEvm.getPublicClientForEvmNetwork(evmNetworkId)
  if (!provider) return false

  let cleaned = false
  for (const tx of unknownTxs) {
    try {
      await provider.getTransaction({ hash: tx.hash })
    } catch (err) {
      if (err instanceof Error && err.name === "TransactionNotFoundError") {
        await updateTransactionStatus(tx.id, "error")
        cleaned = true
      }
    }
  }

  return cleaned
}

// --- Internal helpers ---

const cleanupEvmTransactions = async (txs: WalletTransactionEth[]): Promise<void> => {
  if (txs.length === 0) return

  const byNetwork = groupBy(txs, (tx) => tx.networkId)
  for (const [networkId, networkTxs] of byNetwork) {
    try {
      const provider = await chainConnectorEvm.getPublicClientForEvmNetwork(networkId)
      if (!provider) continue

      for (const tx of networkTxs) {
        try {
          await provider.getTransaction({ hash: tx.hash })
        } catch (err) {
          if (err instanceof Error && err.name === "TransactionNotFoundError") {
            await updateTransactionStatus(tx.id, "error")
          }
        }
      }
    } catch {
      // Provider unavailable — skip this network
    }
  }
}

const cleanupSubstrateTransactions = async (txs: WalletTransactionDot[]): Promise<void> => {
  if (txs.length === 0) return

  // Group by networkId + account: one system_accountNextIndex call per address per chain
  const byKey = groupBy(txs, (tx) => `${tx.networkId}:${tx.account}`)
  for (const [, accountTxs] of byKey) {
    const first = accountTxs[0]!
    try {
      const nextIndex = await chainConnector.send<number>(
        first.networkId,
        "system_accountNextIndex",
        [first.account]
      )

      for (const tx of accountTxs) {
        if (typeof tx.nonce !== "number") continue
        // nextIndex <= nonce: nonce not consumed, tx not in pool → dropped
        if (nextIndex <= tx.nonce) {
          await updateTransactionStatus(tx.id, "error")
        }
        // nextIndex > nonce: nonce consumed (included or superseded).
        // Leave as "unknown" — we can't determine the outcome without
        // looking up the extrinsic in block history.
      }
    } catch {
      // Chain unavailable — skip
    }
  }
}

const cleanupSolanaTransactions = async (txs: WalletTransactionSol[]): Promise<void> => {
  if (txs.length === 0) return

  const byNetwork = groupBy(txs, (tx) => tx.networkId)
  for (const [networkId, networkTxs] of byNetwork) {
    try {
      const connection = await chainConnectorSol.getConnection(networkId as SolNetworkId)
      const signatures = networkTxs.map((tx) => tx.signature)
      const result = await connection.getSignatureStatuses(signatures, {
        searchTransactionHistory: true,
      })

      for (let i = 0; i < networkTxs.length; i++) {
        const tx = networkTxs[i]!
        const status = result.value[i]

        if (!status) {
          // Signature unknown to cluster → dropped
          await updateTransactionStatus(tx.id, "error")
        } else if (status.err) {
          await updateTransactionStatus(tx.id, "error")
        } else if (
          status.confirmationStatus === "confirmed" ||
          status.confirmationStatus === "finalized"
        ) {
          // Missed confirmation — recover to success
          await updateTransactionStatus(
            tx.id,
            "success",
            undefined,
            status.confirmationStatus === "finalized"
          )
        }
      }
    } catch {
      // Connection unavailable — skip
    }
  }
}

const groupBy = <T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> => {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    const group = map.get(key) ?? []
    group.push(item)
    map.set(key, group)
  }
  return map
}
