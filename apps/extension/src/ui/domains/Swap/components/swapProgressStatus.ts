import type { WalletTransaction } from "@core/domains/transactions/types"
import type { ProcessAnimationStatus } from "@ui/components/ProcessAnimation/ProcessAnimation"

export type SwapStatusDetails = {
  title: string
  subtitle: string
  animStatus: ProcessAnimationStatus
  pillLabel?: string
}

type Translator = (key: string) => string

export const getSwapProgressDetails = (
  t: Translator,
  tx: WalletTransaction | null | undefined,
  isCrossChain: boolean
): SwapStatusDetails => {
  // Pill labels match the swap status labels used in TxHistoryList
  const inProgress = (pillLabel: string): SwapStatusDetails => ({
    title: t("Transaction in progress"),
    subtitle: isCrossChain ? t("This may take a few minutes") : t("This may take a moment"),
    animStatus: "processing",
    pillLabel,
  })

  // Phase 1: On-chain tx is still pending/processing
  if (!tx || tx.status === "pending") return inProgress(t("Submitting"))

  // On-chain tx failed
  if (tx.status === "error") {
    return {
      title: t("Transaction failed"),
      subtitle: t("Your swap transaction failed on-chain."),
      animStatus: "failure",
    }
  }

  // On-chain tx status unknown
  if (tx.status === "unknown") {
    return {
      title: t("Transaction not found"),
      subtitle: t("Transaction was submitted, but Talisman is unable to track its progress."),
      animStatus: "failure",
    }
  }

  // On-chain tx replaced (getCanonicalTransaction already redirected speed-ups
  // to the mined transaction, so this means the swap was genuinely cancelled)
  if (tx.status === "replaced") {
    return {
      title: t("Transaction cancelled"),
      subtitle: t("This transaction has been replaced with another one."),
      animStatus: "failure",
    }
  }

  // Phase 2: On-chain tx succeeded — track exchange/protocol status
  switch (tx.swapStatus) {
    case "waiting":
      return inProgress(t("Depositing funds"))
    case "confirming":
      return inProgress(t("Confirming"))
    case "exchanging":
      return inProgress(t("Exchanging"))
    case "sending":
      return inProgress(t("Sending"))
    case "verifying":
      return inProgress(t("Verifying"))
    case "finished":
      return {
        title: t("Swap complete"),
        subtitle: t("Your swap was successful!"),
        animStatus: "success",
      }
    case "failed":
    case "expired":
    case "refunded":
      return {
        title: t("Swap failed"),
        subtitle:
          tx.swapStatus === "refunded"
            ? t("The exchange has refunded your tokens.")
            : tx.swapStatus === "expired"
              ? t("The exchange has expired.")
              : t("The exchange failed to complete your swap."),
        animStatus: "failure",
      }
    case "invalid":
    case "unknown":
      // invalid: LiFi's status API sometimes fails to parse transactions (especially Solana)
      // even though the on-chain tx succeeded.
      // unknown: the watcher gave up after repeated fetch failures or an expired
      // not-found grace period.
      // Both are ambiguous — the user's funds may have been swapped, so don't show
      // a definitive "Swap failed".
      return {
        title: t("Swap status unknown"),
        subtitle: t(
          "Your transaction succeeded on-chain but the swap tracker couldn't confirm the result. Please check your balance."
        ),
        animStatus: "failure",
      }
    case "not_found":
      // Exchange hasn't seen the deposit yet — the watcher flips this to "unknown"
      // if it stays not found past the grace period
      return inProgress(t("Depositing funds"))
    default:
      // Swap status not yet loaded — exchange hasn't seen the deposit yet
      return inProgress(t("Depositing funds"))
  }
}
