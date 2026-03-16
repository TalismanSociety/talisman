/**
 * Checks if an error is a user-initiated rejection (e.g. user cancelled the transaction).
 *
 * TODO update for solana
 *
 * Covers:
 * - EIP-1193 code 4001 (user rejected request)
 * - ethers.js ACTION_REJECTED
 * - Substrate signing "Cancelled" from the signing handler
 * - Common rejection message patterns across wallets/providers
 */
export const isUserRejectionError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false

  const { code, message } = error as { code?: number | string; message?: string }

  if (code === 4001 || code === "ACTION_REJECTED") return true

  if (typeof message === "string") {
    const lower = message.toLowerCase()
    return (
      lower.includes("cancelled") ||
      lower.includes("rejected") ||
      (lower.includes("denied") && !lower.includes("permission denied"))
    )
  }

  return false
}
