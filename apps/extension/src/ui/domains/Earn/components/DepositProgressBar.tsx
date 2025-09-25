import { classNames } from "@talismn/util"
import { FC } from "react"

interface DepositProgressBarProps {
  currentStep: number
  tokenSymbol: string
}

export const DepositProgressBar: FC<DepositProgressBarProps> = ({ currentStep, tokenSymbol }) => {
  const steps = [
    { id: 1, name: `Approve ${tokenSymbol}` },
    { id: 2, name: `Deposit ${tokenSymbol}` },
  ]

  return (
    <div className="flex flex-col items-center">
      {/* Circle-line-circle row */}
      <div className="flex w-full items-center justify-center px-20">
        {/* First circle */}
        <div
          className={classNames(
            "z-[1] flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
            currentStep >= 1 ? "bg-primary-500" : "bg-white",
          )}
        >
          <span
            className={classNames(
              "flex items-center justify-center text-sm font-normal",
              currentStep >= 1 ? "text-black" : "text-grey-400",
            )}
          >
            1
          </span>
        </div>

        {/* Connecting line */}
        <div
          className={classNames("h-1 flex-1", currentStep > 1 ? "bg-primary-500" : "bg-grey-400")}
        />

        {/* Second circle */}
        <div
          className={classNames(
            "z-[1] flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
            currentStep >= 2 ? "bg-primary-500" : "bg-grey-400",
          )}
        >
          <span
            className={classNames(
              "flex items-center justify-center text-sm font-normal",
              currentStep >= 2 ? "text-black" : "text-white",
            )}
          >
            2
          </span>
        </div>
      </div>

      {/* Labels row */}
      <div className="mt-2 flex w-full justify-between px-8">
        <div
          className={classNames(
            "text-sm font-bold",
            currentStep >= 1 ? "text-primary-500" : "text-grey-400",
          )}
        >
          {steps[0].name}
        </div>
        <div
          className={classNames(
            "text-sm font-bold",
            currentStep >= 2 ? "text-primary-500" : "text-grey-400",
          )}
        >
          {steps[1].name}
        </div>
      </div>
    </div>
  )
}
