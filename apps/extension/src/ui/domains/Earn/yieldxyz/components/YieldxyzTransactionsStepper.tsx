import { LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { TransactionDto } from "extension-core"
import { FC } from "react"

export const YieldxyzTransactionsStepper: FC<{
  transactions: TransactionDto[]
  stepIndex: number
  isProcessing?: boolean
}> = ({ transactions, stepIndex, isProcessing: isSubmitting }) => {
  if (!transactions?.length) return null

  const clampedStepIndex = Math.min(Math.max(stepIndex, 0), transactions.length - 1)
  const columns = `repeat(${transactions.length}, minmax(0, 1fr))`
  const lineLeftPct = 50 / transactions.length
  const lineWidthPct = (100 * (transactions.length - 1)) / transactions.length
  const activeLineWidthPct =
    transactions.length > 1 ? (clampedStepIndex / (transactions.length - 1)) * lineWidthPct : 0

  return (
    <div className="flex w-full max-w-[400px] flex-col items-center">
      <div className="relative w-full px-8">
        {transactions.length > 1 && (
          <>
            <div
              className="bg-grey-600 pointer-events-none absolute top-1/2 z-0 h-px -translate-y-1/2"
              style={{ left: `${lineLeftPct}%`, width: `${lineWidthPct}%` }}
              aria-hidden
            />
            <div
              className="bg-primary-500 pointer-events-none absolute top-1/2 z-0 h-px -translate-y-1/2"
              style={{ left: `${lineLeftPct}%`, width: `${activeLineWidthPct}%` }}
              aria-hidden
            />
          </>
        )}

        <div
          className="grid w-full items-center justify-items-center"
          style={{ gridTemplateColumns: columns }}
        >
          {transactions.map((transaction, index) => {
            const isActive = index <= clampedStepIndex
            const isProcessing =
              transaction.status === "BROADCASTED" || (isSubmitting && index === clampedStepIndex)

            return (
              <div key={transaction.id ?? index} className="z-[1] flex justify-center">
                <div
                  className={classNames(
                    "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full",
                    isActive ? "bg-primary-500" : "bg-grey-600",
                  )}
                >
                  {isProcessing ? (
                    <LoaderIcon
                      className={classNames(
                        "animate-spin-slow h-8 w-8",
                        isActive ? "text-black" : "text-grey-700",
                      )}
                    />
                  ) : (
                    <span
                      className={classNames(
                        "text-sm font-bold leading-none",
                        isActive ? "text-black" : "text-body-secondary",
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
        {transactions.map((transaction, index) => {
          const isActive = index <= clampedStepIndex
          const label = transaction.type.replaceAll("_", " ").toLowerCase()

          return (
            <div
              key={transaction.id ?? `label-${index}`}
              className={classNames(
                "text-center text-base font-bold capitalize leading-tight",
                isActive ? "text-primary-500" : "text-grey-600",
              )}
            >
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
