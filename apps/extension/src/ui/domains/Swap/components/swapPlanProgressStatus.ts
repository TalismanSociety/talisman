import type { SwapPlan } from "@core/domains/swaps/plans/types"
import type { WalletTransaction } from "@core/domains/transactions/types"

import { getSwapProgressDetails, type SwapStatusDetails } from "./swapProgressStatus"

type Translator = (key: string, options?: Record<string, unknown>) => string

/**
 * What the progress view says about a plan. A completed plan's last leg landed on its source chain,
 * so from there the view follows that leg's delivery, as the single-leg progress view does.
 */
export const getSwapPlanProgressDetails = (
  t: Translator,
  plan: SwapPlan | null | undefined,
  lastLegRow: WalletTransaction | null | undefined
): SwapStatusDetails => {
  const count = plan?.legs.length ?? 0
  const current = plan ? plan.legs.findIndex((leg) => leg.state.at !== "landed") : -1

  switch (plan?.phase) {
    case "completed":
      return getSwapProgressDetails(t, lastLegRow, true)

    case "paused": {
      const waiting = plan.legs[current]?.state
      const step = current + 1
      return waiting?.at === "awaiting-user" && waiting.why === "hardware"
        ? {
            title: t("Sign step {{step}} on your Ledger", { step }),
            subtitle: t("Your swap continues once you sign step {{step}}.", { step }),
            animStatus: "processing",
          }
        : {
            title: t("Unlock Talisman to continue"),
            subtitle: t("Your swap continues once Talisman is unlocked."),
            animStatus: "processing",
          }
    }

    case "stopped": {
      const failed = plan.legs.find((leg) => leg.state.at === "failed")?.state
      const done = current
      return {
        title: done ? t("Swap stopped after step {{step}}", { step: done }) : t("Swap stopped"),
        subtitle:
          failed?.at === "failed" && !failed.hash
            ? t("Your funds wait on your account at the end of step {{step}}.", { step: done })
            : t("Step {{step}} did not complete. Check your activity for its status.", {
                step: done + 1,
              }),
        animStatus: "failure",
      }
    }

    case "aborted":
      return {
        title: t("Swap cancelled"),
        subtitle: t("Step 1 did not go through. Your funds did not move."),
        animStatus: "failure",
      }

    default:
      return {
        title: t("Swap in progress"),
        subtitle: t("This may take a few minutes. You can close this window."),
        animStatus: "processing",
        pillLabel:
          current >= 0 ? t("Step {{step}} of {{count}}", { step: current + 1, count }) : undefined,
      }
  }
}
