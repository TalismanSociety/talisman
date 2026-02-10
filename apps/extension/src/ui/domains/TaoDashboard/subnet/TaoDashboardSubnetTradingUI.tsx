import type { FC } from "react"

import { PoweredBySn45 } from "../subnets/TaoDashboardHeader"
import { SubnetCharts } from "./components/SubnetChartTabs"
import { SubnetTransactions } from "./components/SubnetTransactions"
import { TaoDashboardSidebar } from "./components/sidebar/TaoDashboardSidebar"
import { SwapTxNotifications } from "./swap/SwapTxNotifications"
import { SwapTxWatcherProvider } from "./swap/SwapTxWatcher"
import { TaoDashboardSwap } from "./swap/TaoDashboardSwap"
import { TaoDashboardSubnetBreadcrumb } from "./TaoDashboardSubnetBreadcrumb"
import { TaoDashboardSubnetPickerModal } from "./TaoDashboardSubnetPickerModal"

export const TaoDashboardSubnetTradingUI: FC<{ netuid: number }> = ({ netuid }) => {
  return (
    <SwapTxWatcherProvider>
      <div className="flex h-[120rem] w-full flex-col gap-6 overflow-hidden">
        {/* Breadcrumb / Header */}
        <div className="flex shrink-0 items-center justify-between">
          <TaoDashboardSubnetBreadcrumb netuid={netuid} />
          <PoweredBySn45 />
        </div>

        {/* Main Content Grid - Fixed height layout */}
        <div className="flex w-full grow flex-row gap-6 overflow-hidden">
          {/* Left Column - Charts and Trading */}
          <div className="flex min-w-0 grow flex-col gap-6 overflow-hidden">
            {/* Price Chart with Sentiment Markers */}
            <SubnetCharts netuid={netuid} className="w-full shrink-0" />

            {/* Swap and Transactions row - stretch to fill remaining space */}
            <div className="flex w-full grow flex-row gap-6 overflow-hidden">
              {/* Swap component */}
              <div className="flex h-full flex-1 flex-col overflow-hidden rounded-lg bg-grey-850">
                <TaoDashboardSwap netuid={netuid} />
              </div>

              {/* Recent Transactions */}
              <div className="flex h-full flex-1 flex-col overflow-hidden rounded-lg">
                <SubnetTransactions netuid={netuid} />
              </div>
            </div>
          </div>

          {/* Right Column - Analytics Sidebar */}
          <div className="h-full w-[38rem] shrink-0 overflow-hidden">
            <TaoDashboardSidebar netuid={netuid} />
            {/* <SubnetRightSidebar netuid={netuid} className="h-full" /> */}
          </div>
        </div>
      </div>
      <TaoDashboardSubnetPickerModal />
      <SwapTxNotifications />
    </SwapTxWatcherProvider>
  )
}
