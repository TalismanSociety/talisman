import { LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { TransactionDto } from "extension-core"
import { FC, Fragment } from "react"

export const YieldxyzTransactionsSteps: FC<{
  transactions: TransactionDto[]
  stepIndex: number
}> = ({ transactions, stepIndex }) => {
  if (!transactions?.length) return null

  const clampedStepIndex = Math.min(Math.max(stepIndex, 0), transactions.length - 1)
  const gridColumnCount = Math.max(transactions.length * 2 - 1, 1)
  const gridTemplateColumns = `repeat(${gridColumnCount}, minmax(0, 1fr))`

  return (
    <div className="flex w-full max-w-[400px] flex-col items-center">
      <div className="grid w-full items-center px-6" style={{ gridTemplateColumns }}>
        {transactions.map((transaction, index) => {
          const isActive = index <= clampedStepIndex
          const isLineActive = index < clampedStepIndex
          const isBroadcasted = transaction.status === "BROADCASTED"
          const circleColumn = index * 2 + 1

          return (
            <Fragment key={transaction.id ?? index}>
              <div
                style={{ gridColumn: `${circleColumn} / span 1` }}
                className="flex justify-center"
              >
                <div
                  className={classNames(
                    "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full",
                    isActive ? "bg-primary-500" : "bg-grey-400",
                  )}
                >
                  {isBroadcasted ? (
                    <LoaderIcon
                      className={classNames(
                        "animate-spin-slow h-5 w-5",
                        isActive ? "text-black" : "text-grey-700",
                      )}
                    />
                  ) : (
                    <span
                      className={classNames(
                        "text-sm font-bold",
                        isActive ? "text-black" : "text-white",
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
              </div>

              {index < transactions.length - 1 && (
                <div
                  style={{ gridColumn: `${circleColumn + 1} / span 1` }}
                  className={classNames(
                    "h-1 w-full",
                    isLineActive ? "bg-primary-500" : "bg-grey-400",
                  )}
                />
              )}
            </Fragment>
          )
        })}
      </div>

      <div className="mt-3 grid w-full items-start px-6" style={{ gridTemplateColumns }}>
        {transactions.map((transaction, index) => {
          const isActive = index <= clampedStepIndex
          const label = transaction.title || transaction.description || `Transaction ${index + 1}`
          const circleColumn = index * 2 + 1

          return (
            <div
              key={transaction.id ?? `label-${index}`}
              style={{ gridColumn: `${circleColumn} / span 1` }}
              className={classNames(
                "text-center text-sm font-bold leading-tight",
                isActive ? "text-primary-500" : "text-grey-400",
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
