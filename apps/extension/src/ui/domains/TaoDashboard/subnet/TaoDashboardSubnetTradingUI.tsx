import { cn } from "@talismn/util"
import { FC, PropsWithChildren } from "react"

import { TaoDashboardSubnetBreadcrumb } from "./TaoDashboardSubnetBreadcrumb"
import { TaoDashboardSubnetPickerModal } from "./TaoDashboardSubnetPickerModal"

export const TaoDashboardSubnetTradingUI: FC<{ netuid: number }> = ({ netuid }) => {
  return (
    <div className="flex w-full flex-col gap-16 overflow-hidden">
      <TaoDashboardSubnetBreadcrumb netuid={netuid} />

      <div className="flex w-full gap-16 overflow-hidden">
        <div className="flex grow flex-col gap-16">
          <div>
            <Placeholder>GRAPH</Placeholder>
          </div>
          <div className="flex w-full gap-16">
            <Placeholder>TRADE</Placeholder>
            <Placeholder>TRANSACTIONS</Placeholder>
          </div>
        </div>
        <div className="w-[37rem] shrink-0">
          <Placeholder className="h-full">TABS</Placeholder>
        </div>
      </div>

      <TaoDashboardSubnetPickerModal />
    </div>
  )
}

const Placeholder: FC<PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <div
    className={cn(
      "bg-grey-800 flex h-[50rem] flex-1 shrink-0 items-center justify-center rounded",
      className,
    )}
  >
    {children}
  </div>
)
