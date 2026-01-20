import type { FC } from "react"

import { PoweredBySn45 } from "../subnets/TaoDashboardHeader"
import { SubnetChartTabs } from "./components/SubnetChartTabs"
import { SubnetRightSidebar } from "./components/SubnetRightSidebar"
import { SubnetTransactions } from "./components/SubnetTransactions"
import { TaoDashboardSwap } from "./swap/TaoDashboardSwap"
import { TaoDashboardSubnetBreadcrumb } from "./TaoDashboardSubnetBreadcrumb"
import { TaoDashboardSubnetPickerModal } from "./TaoDashboardSubnetPickerModal"

export const TaoDashboardSubnetTradingUI: FC<{ netuid: number }> = ({ netuid }) => {
  return (
    <div className="flex w-full flex-col gap-6 overflow-hidden">
      {/* Breadcrumb / Header */}
      <div className="flex items-center justify-between">
        <TaoDashboardSubnetBreadcrumb netuid={netuid} />
        <PoweredBySn45 />
      </div>

      {/* Main Content Grid - Fixed height layout */}
      <div className="flex w-full flex-col gap-6 xl:h-[calc(100vh-100px)] xl:max-h-[1100px] xl:flex-row">
        {/* Left Column - Charts and Trading */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 xl:h-full">
          {/* Price/Flow Chart with Tab Selector */}
          <SubnetChartTabs netuid={netuid} className="w-full shrink-0" />

          {/* Swap and Transactions row - stretch to fill remaining space */}
          <div className="flex min-h-[400px] w-full flex-1 flex-col gap-6 lg:flex-row">
            {/* Swap component */}
            <div className="flex w-full flex-1 flex-col overflow-hidden rounded-lg bg-grey-850">
              <TaoDashboardSwap netuid={netuid} />
            </div>

            {/* Recent Transactions */}
            <div className="flex w-full flex-1 flex-col overflow-hidden rounded-lg bg-grey-850">
              <SubnetTransactions netuid={netuid} className="min-h-0 flex-1" />
            </div>
          </div>
        </div>

        {/* Right Column - Analytics Sidebar */}
        <div className="w-full xl:h-full xl:w-[380px] xl:shrink-0">
          <SubnetRightSidebar netuid={netuid} className="h-full" />
        </div>
      </div>

      <TaoDashboardSubnetPickerModal />
    </div>
  )
}
