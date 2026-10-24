import type { PlanStepStatus } from "@core/domains/swaps/plans/helpers"
import { CheckIcon, ExternalLinkIcon, LoaderIcon, XIcon } from "@talismn/icons"
import { useAccountsMap } from "@ui/state/accounts"
import { useNetworksMapById } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import type { TFunction } from "i18next"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { StepRowContext, SwapPlanStepRow } from "./swapPlanStepRows"

export const useStepRowContext = (): StepRowContext => {
  const { t } = useTranslation()
  const accounts = useAccountsMap()
  const networks = useNetworksMapById()
  return useMemo(() => ({ t, accounts, networks }), [accounts, networks, t])
}

const CIRCLE_TONE: Record<PlanStepStatus, string> = {
  "upcoming": "bg-grey-600 text-body-secondary",
  "skipped": "bg-grey-600 text-body-secondary line-through",
  "waiting-on-you": "bg-primary-500 text-black",
  "in-progress": "bg-primary-500 text-black",
  "done": "bg-primary-500 text-black",
  "failed": "bg-alert-error text-body",
}

const STATUS_TONE: Record<PlanStepStatus, string> = {
  "upcoming": "text-body-secondary",
  "skipped": "text-body-secondary",
  "waiting-on-you": "text-primary",
  "in-progress": "text-primary",
  "done": "text-body-secondary",
  "failed": "text-alert-error",
}

const statusWord = (t: TFunction, status: PlanStepStatus) => {
  switch (status) {
    case "upcoming":
      return t("Next")
    case "waiting-on-you":
      return t("Waiting")
    case "in-progress":
      return t("In progress")
    case "done":
      return t("Done")
    case "failed":
      return t("Failed")
    case "skipped":
      return t("Skipped")
  }
}

const StepCircle: FC<{ number: number; status: PlanStepStatus }> = ({ number, status }) => (
  <div
    className={cn(
      "flex size-12 shrink-0 items-center justify-center rounded-full font-bold text-xs",
      CIRCLE_TONE[status]
    )}
  >
    {status === "in-progress" ? (
      <LoaderIcon className="animate-spin-slow text-sm" />
    ) : status === "done" ? (
      <CheckIcon className="text-sm" />
    ) : status === "failed" ? (
      <XIcon className="text-sm" />
    ) : (
      number
    )}
  </div>
)

const StepDetail: FC<{ detail: string; href?: string }> = ({ detail, href }) =>
  href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="flex min-w-0 items-center gap-2 text-body-secondary text-xs hover:text-body"
    >
      <span className="truncate">{detail}</span>
      <ExternalLinkIcon className="shrink-0" />
    </a>
  ) : (
    <div className="truncate text-body-secondary text-xs">{detail}</div>
  )

export const SwapPlanStepList: FC<{ steps: SwapPlanStepRow[]; showStatus?: boolean }> = ({
  steps,
  showStatus = true,
}) => {
  const { t } = useTranslation()

  return (
    <ol className="flex w-full flex-col divide-y divide-grey-800 rounded-lg bg-grey-900 text-left">
      {steps.map((step, index) => (
        <li key={step.key} className="flex h-28 items-center gap-6 px-8">
          <StepCircle number={index + 1} status={step.status} />
          <div className="flex min-w-0 grow flex-col gap-1">
            <div className="truncate font-bold text-body text-sm">{step.label}</div>
            <StepDetail detail={step.detail} href={step.href} />
          </div>
          {showStatus ? (
            <div className={cn("w-44 shrink-0 text-right text-xs", STATUS_TONE[step.status])}>
              {statusWord(t, step.status)}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
