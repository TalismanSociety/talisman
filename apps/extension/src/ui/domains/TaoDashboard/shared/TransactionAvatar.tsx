import { ArrowDownIcon, ArrowUpIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import type { FC } from "react"

export const TransactionAvatar: FC<{ isBuy: boolean; address: string; className?: string }> = ({
  isBuy,
  address,
  className,
}) => (
  <div className={cn("relative shrink-0", className)}>
    <AccountIcon address={address} className="size-[2.25rem] text-2xl" />
    <div className="absolute -right-2 -bottom-2 flex size-10 items-center justify-center rounded-full bg-grey-850 p-px">
      <div
        className={cn(
          "flex size-full flex-col items-center justify-center rounded-full",
          isBuy ? "bg-buy/15" : "bg-sell/15"
        )}
      >
        {isBuy ? (
          <ArrowDownIcon className="size-7 rounded-full text-green" />
        ) : (
          <ArrowUpIcon className="size-7 rounded-full text-sell" />
        )}
      </div>
    </div>
  </div>
)
