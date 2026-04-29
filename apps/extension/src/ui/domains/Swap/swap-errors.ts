import type { TokenId } from "@talismn/chaindata-provider"
import type { TFunction } from "i18next"

/**
 * Structured error types for the swap confirmation flow.
 *
 * Each variant carries enough context for the UI to render a targeted,
 * user-friendly message (e.g. "Insufficient SOL to pay for transaction fees").
 */
export type SwapConfirmError =
  | {
      type: "insufficient-swap-balance"
      /** Token the user is trying to swap but doesn't hold enough of. */
      tokenId: TokenId
    }
  | {
      type: "insufficient-fee-balance"
      /** Native/fee token required to pay for gas. */
      feeTokenId: TokenId
      /** Estimated fee in planck. */
      required: bigint
      /** User's available balance in planck. */
      available: bigint
    }
  | {
      type: "transaction-craft-error"
      /** Human-readable reason the transaction could not be built. */
      message: string
    }
  | {
      type: "transaction-likely-to-fail"
      /** Reason from gas estimation / simulation. */
      message: string
    }
  | {
      type: "quote-stale"
    }

// ---------------------------------------------------------------------------
// Classifier — maps raw errors into structured types
// ---------------------------------------------------------------------------

const STALE_QUOTE_PATTERNS = ["please select the quote again", "quote expired", "quote has expired"]

const isStaleQuoteError = (msg: string): boolean =>
  STALE_QUOTE_PATTERNS.some((p) => msg.toLowerCase().includes(p))

const isAbortError = (err: unknown): boolean => {
  if (err instanceof DOMException && err.name === "AbortError") return true
  if (err instanceof Error && err.message === "Aborted") return true
  return false
}

/**
 * Classify a raw error thrown during exchange creation or transaction building
 * into a structured {@link SwapConfirmError}, or `null` if the error should be
 * silently ignored (e.g. query aborts).
 */
export const classifySwapError = (rawError: unknown): SwapConfirmError | null => {
  if (!rawError) return null
  if (isAbortError(rawError)) return null

  const message =
    (rawError as { shortMessage?: string }).shortMessage ??
    (rawError as Error).message ??
    "Unknown error"

  if (isStaleQuoteError(message)) return { type: "quote-stale" }

  return { type: "transaction-craft-error", message }
}

/**
 * Classify an error from fee estimation / gas simulation into a structured type,
 * or `null` if the error should be ignored.
 */
export const classifyFeeEstimationError = (rawError: unknown): SwapConfirmError | null => {
  if (!rawError) return null
  if (isAbortError(rawError)) return null

  const message =
    (rawError as { shortMessage?: string }).shortMessage ??
    (rawError as Error).message ??
    "Unknown error"

  return { type: "transaction-likely-to-fail", message }
}

// ---------------------------------------------------------------------------
// User-facing messages
// ---------------------------------------------------------------------------

/**
 * Produce a translated, user-facing error message for a {@link SwapConfirmError}.
 *
 * `tokenSymbol` / `feeTokenSymbol` are resolved by the caller so we don't
 * couple this module to the token store.
 */
export const getSwapErrorMessage = (
  error: SwapConfirmError,
  t: TFunction,
  opts?: { tokenSymbol?: string; feeTokenSymbol?: string }
): string => {
  switch (error.type) {
    case "insufficient-swap-balance":
      return opts?.tokenSymbol
        ? t("Insufficient {{symbol}} balance", { symbol: opts.tokenSymbol })
        : t("Insufficient balance")

    case "insufficient-fee-balance":
      return opts?.feeTokenSymbol
        ? t("Insufficient {{symbol}} to pay for transaction fees", {
            symbol: opts.feeTokenSymbol,
          })
        : t("Insufficient balance to pay for transaction fees")

    case "transaction-craft-error":
      return error.message

    case "transaction-likely-to-fail":
      return t("Transaction is likely to fail: {{reason}}", { reason: error.message })

    case "quote-stale":
      return t("Quote has expired. Please go back and get a new quote.")
  }
}
