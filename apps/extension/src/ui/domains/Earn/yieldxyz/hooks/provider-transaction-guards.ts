export type ProviderTransactionIssue = "sender" | "amount"

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
