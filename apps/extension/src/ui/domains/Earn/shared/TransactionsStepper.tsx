import { LoaderIcon } from "@talismn/icons"
import { cn } from "@ui/util/cn"

import type { FC } from "react"

export type TransactionsStepperStep = {
  key: string
  label: string
  isProcessing?: boolean
}

export const TransactionsStepper: FC<{
  steps: TransactionsStepperStep[]
  stepIndex: number
  isProcessing?: boolean
}> = ({ steps, stepIndex, isProcessing: isSubmitting }) => {
  if (!steps?.length) return null

  const clampedStepIndex = Math.min(Math.max(stepIndex, 0), steps.length - 1)
  const columns = `repeat(${steps.length}, minmax(0, 1fr))`
  const lineLeftPct = 50 / steps.length
  const lineWidthPct = (100 * (steps.length - 1)) / steps.length
  const activeLineWidthPct =
    steps.length > 1 ? (clampedStepIndex / (steps.length - 1)) * lineWidthPct : 0

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
            const isActive = index <= clampedStepIndex
            const isProcessing = step.isProcessing || (isSubmitting && index === clampedStepIndex)

            return (
              <div key={step.key} className="z-1 flex justify-center">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                    isActive ? "bg-primary-500" : "bg-grey-600"
                  )}
                >
                  {isProcessing ? (
                    <LoaderIcon
                      className={cn(
                        "h-8 w-8 animate-spin-slow",
                        isActive ? "text-black" : "text-grey-700"
                      )}
                    />
                  ) : (
                    <span
                      className={cn(
                        "font-bold text-sm leading-none",
                        isActive ? "text-black" : "text-body-secondary"
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
        {steps.map((step, index) => {
          const isActive = index <= clampedStepIndex

          return (
            <div
              key={`label-${step.key}`}
              className={cn(
                "text-center font-bold text-base capitalize leading-tight",
                isActive ? "text-primary-500" : "text-grey-600"
              )}
            >
              {step.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
