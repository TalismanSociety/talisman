import type { TransactionDto } from "@core/domains/earn/exports"

import { getYieldxyzEthTransactionValue } from "./yieldxyz-eth-transaction"

export type ProviderTransactionIssue = "sender" | "amount"

/**
 * An action is a sequence of transactions, and the user confirms the amount once for the whole
 * sequence. Checking each step against the full amount would let a provider spend it once per step,
 * so every step is checked against what the other steps leave of it. A sequence that spends more
 * than the confirmed amount in total is rejected at its first step, before anything is signed.
 */
export const getYieldxyzStepMaxNativeValue = (params: {
  transactions: TransactionDto[]
  transactionId: string
  maxNativeValue: bigint
}): bigint => {
  const { transactions, transactionId, maxNativeValue } = params

  return transactions
    .filter((tx) => tx.id !== transactionId)
    .reduce((remaining, tx) => remaining - getYieldxyzEthTransactionValue(tx), maxNativeValue)
}

/**
 * The confirmation screen shows the amount the user entered, the product and the fee — never the
 * transaction the provider returned. These are the parts of that transaction which can be checked
 * against what the user confirmed, without a decoder for every protocol we route to.
 */
export const getYieldxyzEvmTransactionIssue = (params: {
  from: string | null | undefined
  value: bigint | undefined
  address: string
  maxNativeValue: bigint
}): ProviderTransactionIssue | null => {
  const { from, value, address, maxNativeValue } = params

  if (!from || from.toLowerCase() !== address.toLowerCase()) return "sender"
  if ((value ?? 0n) > maxNativeValue) return "amount"

  return null
}

/**
 * Solana amounts live inside the instructions, so only the fee payer can be checked here — the
 * account that is about to sign must be the one the transaction is built for.
 */
export const getYieldxyzSolTransactionIssue = (params: {
  feePayer: string
  address: string
}): ProviderTransactionIssue | null => (params.feePayer === params.address ? null : "sender")
