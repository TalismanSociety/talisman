import type { FC } from "react"

import { PoweredBySn45 } from "../subnets/TaoDashboardHeader"
// import { SubnetChartTabs } from "./components/SubnetChartTabs"
// import { SubnetRightSidebar } from "./components/SubnetRightSidebar"
// import { SubnetTransactions } from "./components/SubnetTransactions"
import { SwapTxNotifications } from "./swap/SwapTxNotifications"
import { SwapTxWatcherProvider } from "./swap/SwapTxWatcher"
import { TaoDashboardSwap } from "./swap/TaoDashboardSwap"
import { TaoDashboardSubnetBreadcrumb } from "./TaoDashboardSubnetBreadcrumb"
import { TaoDashboardSubnetPickerModal } from "./TaoDashboardSubnetPickerModal"

export const TaoDashboardSubnetTradingUI: FC<{ netuid: number }> = ({ netuid }) => {
  return (
    <SwapTxWatcherProvider>
      <div className="mb-10 flex items-center justify-between">
        <TaoDashboardSubnetBreadcrumb netuid={netuid} />
        <PoweredBySn45 />
      </div>
      <div className="max-w-[40rem]">
        <TaoDashboardSwap netuid={netuid} />
      </div>
      <TaoDashboardSubnetPickerModal />
      <SwapTxNotifications />
    </SwapTxWatcherProvider>
  )
}

// export const TaoDashboardSubnetTradingUI: FC<{ netuid: number }> = ({ netuid }) => {
//   return (
//     <SwapTxWatcherProvider>
//       <div className="flex w-full flex-col gap-6 overflow-hidden">
//         {/* Breadcrumb / Header */}
//         <div className="flex items-center justify-between">
//           <TaoDashboardSubnetBreadcrumb netuid={netuid} />
//           <PoweredBySn45 />
//         </div>

//         {/* Main Content Grid - Fixed height layout */}
//         <div className="flex w-full flex-row gap-6">
//           {/* Left Column - Charts and Trading */}
//           <div className="flex min-w-0 flex-1 flex-col gap-6">
//             {/* Price Chart with Sentiment Markers */}
//             <SubnetChartTabs netuid={netuid} className="w-full shrink-0" />

//             {/* Swap and Transactions row - stretch to fill remaining space */}
//             <div className="flex h-[600px] max-h-[600px] min-h-[600px] w-full flex-1 shrink-0 flex-row gap-6 overflow-hidden">
//               {/* Swap component */}
//               <div className="flex h-full max-h-full w-full flex-1 flex-col overflow-hidden rounded-lg bg-grey-850">
//                 <TaoDashboardSwap netuid={netuid} />
//               </div>

//               {/* Recent Transactions */}
//               <div className="flex h-full max-h-full w-full flex-1 flex-col overflow-hidden rounded-lg bg-grey-850">
//                 <SubnetTransactions
//                   netuid={netuid}
//                   className="min-h-0 flex-1 overflow-y-auto p-4"
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Right Column - Analytics Sidebar */}
//           <div className="h-full w-[380px] shrink-0">
//             <SubnetRightSidebar netuid={netuid} className="h-full" />
//           </div>
//         </div>
//       </div>
//       <TaoDashboardSubnetPickerModal />
//       <SwapTxNotifications />
//     </SwapTxWatcherProvider>
//   )
// }
