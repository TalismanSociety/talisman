import { cn } from "@talismn/util"
import type { FC, ReactNode } from "react"

export const TokenAndAmountContainer: FC<{
  tokenButton: ReactNode
  tokenAmount: ReactNode
  accountButton: ReactNode
  accountBalance: ReactNode
  isError: boolean
}> = ({ tokenButton, tokenAmount, accountButton, accountBalance, isError }) => {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col gap-8 overflow-hidden rounded bg-grey-900 px-6 py-8 pl-4"
      )}
    >
      <div className="flex w-full items-center justify-between overflow-hidden">
        <div className="max-w-[50%] shrink-0 overflow-hidden">{tokenButton}</div>
        <div className="grow text-right">{tokenAmount}</div>
      </div>
      <div className="flex w-full items-center justify-between overflow-hidden pl-2">
        <div className="max-w-[50%] shrink-0 overflow-hidden">{accountButton}</div>
        <div className="grow text-right">{accountBalance}</div>
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-0 rounded border border-alert-error/50",
          isError ? "visible" : "invisible"
        )}
      ></div>
    </div>
  )
}
