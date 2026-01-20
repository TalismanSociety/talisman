import { cn } from "@talismn/util"
import { type FC, useState } from "react"

import { SubnetPriceChart } from "./SubnetPriceChart"
import { SubnetTaoFlowChart } from "./SubnetTaoFlowChart"

interface SubnetChartTabsProps {
  netuid: number
  className?: string
}

type ChartTab = "price" | "flow"

export const SubnetChartTabs: FC<SubnetChartTabsProps> = ({ netuid, className }) => {
  const [activeTab, setActiveTab] = useState<ChartTab>("price")

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Tab Selector */}
      <div className="mb-4 flex items-center">
        <div className="flex items-center rounded-lg border border-grey-750 bg-grey-900 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("price")}
            className={cn(
              "rounded-md px-4 py-2 font-medium text-sm transition-colors",
              activeTab === "price"
                ? "bg-grey-750 text-white"
                : "text-body-secondary hover:text-body"
            )}
          >
            Price Trend
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("flow")}
            className={cn(
              "rounded-md px-4 py-2 font-medium text-sm transition-colors",
              activeTab === "flow"
                ? "bg-grey-750 text-white"
                : "text-body-secondary hover:text-body"
            )}
          >
            Tao Flow
          </button>
        </div>
      </div>

      {/* Chart Content */}
      {activeTab === "price" ? (
        <SubnetPriceChart netuid={netuid} />
      ) : (
        <SubnetTaoFlowChart netuid={netuid} />
      )}
    </div>
  )
}
