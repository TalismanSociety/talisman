import { LoaderIcon } from "@talismn/icons"
import { cn } from "@ui/util/cn"

import type { FC } from "react"

export type TransactionsStepperStatus =
  | "upcoming"
  | "waiting-on-you"
  | "in-progress"
  | "done"
  | "failed"
  | "skipped"

export type TransactionsStepperStep = {
  key: string
  label: string
  status: TransactionsStepperStatus
  href?: string
}

/** Status of each step of a flow that signs its transactions one after the other and is at `stepIndex` */
export const getSequentialStepStatus = (
  index: number,
  stepIndex: number,
  stepCount: number,
  isProcessing: boolean
): TransactionsStepperStatus => {
  const currentIndex = Math.min(Math.max(stepIndex, 0), stepCount - 1)
  if (index < currentIndex) return "done"
  if (index > currentIndex) return "upcoming"
  return isProcessing ? "in-progress" : "waiting-on-you"
}

const isReached = (status: TransactionsStepperStatus) =>
  status !== "upcoming" && status !== "skipped"

export const TransactionsStepper: FC<{ steps: TransactionsStepperStep[] }> = ({ steps }) => {
  if (!steps.length) return null

  const progressIndex = Math.max(
    steps.findLastIndex((step) => isReached(step.status)),
    0
  )
  const columns = `repeat(${steps.length}, minmax(0, 1fr))`
  const lineLeftPct = 50 / steps.length
  const lineWidthPct = (100 * (steps.length - 1)) / steps.length
  const activeLineWidthPct =
    steps.length > 1 ? (progressIndex / (steps.length - 1)) * lineWidthPct : 0

  return (
    <div className="flex w-full max-w-[400px] flex-col items-center">
      <div className="relative w-full px-8">
        {steps.length > 1 && (
          <>
            <div
              className="pointer-events-none absolute top-1/2 z-0 h-px -translate-y-1/2 bg-grey-600"
              style={{ left: `${lineLeftPct}%`, width: `${lineWidthPct}%` }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute top-1/2 z-0 h-px -translate-y-1/2 bg-primary-500"
              style={{ left: `${lineLeftPct}%`, width: `${activeLineWidthPct}%` }}
              aria-hidden
            />
          </>
        )}

        <div
          className="grid w-full items-center justify-items-center"
          style={{ gridTemplateColumns: columns }}
        >
          {steps.map((step, index) => {
            const isActive = isReached(step.status)

            return (
              <div key={step.key} className="z-1 flex justify-center">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                    step.status === "failed"
                      ? "bg-alert-error"
                      : isActive
                        ? "bg-primary-500"
                        : "bg-grey-600"
                  )}
                >
                  {step.status === "in-progress" ? (
                    <LoaderIcon className="h-8 w-8 animate-spin-slow text-black" />
                  ) : (
                    <span
                      className={cn(
                        "font-bold text-sm leading-none",
                        isActive ? "text-black" : "text-body-secondary",
                        step.status === "skipped" && "line-through"
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div
        className="mt-3 grid w-full items-start justify-items-center px-8"
        style={{ gridTemplateColumns: columns }}
      >
        {steps.map((step) => (
          <div
            key={`label-${step.key}`}
            className={cn(
              "text-center font-bold text-base capitalize leading-tight",
              step.status === "failed"
                ? "text-alert-error"
                : isReached(step.status)
                  ? "text-primary-500"
                  : "text-grey-600",
              step.status === "skipped" && "line-through"
            )}
          >
            {step.href ? (
              <a href={step.href} target="_blank" rel="noreferrer noopener" className="underline">
                {step.label}
              </a>
            ) : (
              step.label
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
