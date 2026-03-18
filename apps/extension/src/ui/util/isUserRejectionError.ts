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
// Known user-rejection messages from wallets/providers.
// A trailing "*" means "startsWith"; otherwise exact match (case-insensitive).
const USER_REJECTION_MESSAGES: string[] = [
  "cancelled", // Talisman signing handler
  "user rejected the request", // MetaMask / EIP-1193
  "user denied transaction signature", // legacy providers
  "the user rejected the request", // WalletConnect
  "user rejected*", // generic wallet pattern
  "user denied*", // generic wallet pattern
]

export const isUserRejectionError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false

  const { code, message } = error as { code?: number | string; message?: string }

  if (code === 4001 || code === "ACTION_REJECTED") return true

  if (typeof message === "string") {
    const lower = message.toLowerCase()
    return USER_REJECTION_MESSAGES.some((pattern) =>
      pattern.endsWith("*") ? lower.startsWith(pattern.slice(0, -1)) : lower === pattern
    )
  }

  return false
}
