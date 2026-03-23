import { BaseError, HTTPError, LiFiErrorCode } from "@lifi/sdk"

/**
 * Detects errors that indicate the swap quote has become stale and should be refreshed.
 *
 * Covers:
 * - LI.FI: HTTP 409 SlippageError, TransactionExpired (1018)
 * - SimpleSwap / StealthEX: "Quote changed" error messages
 */
export const isQuoteExpiredError = (error: unknown): boolean => {
  if (error instanceof HTTPError) {
    if (error.status === 409) return true
    if (error.code === LiFiErrorCode.SlippageError) return true
    if (error.code === LiFiErrorCode.TransactionExpired) return true
  }

  if (error instanceof BaseError) {
    if (error.code === LiFiErrorCode.SlippageError) return true
    if (error.code === LiFiErrorCode.TransactionExpired) return true
  }

  if (error instanceof Error) {
    if (/quote changed/i.test(error.message)) return true
  }

  return false
}
