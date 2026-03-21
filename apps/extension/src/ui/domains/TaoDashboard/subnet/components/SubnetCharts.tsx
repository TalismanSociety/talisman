import { cn } from "@talismn/util"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { type NavTabConfig, TaoDashboardNavTabs } from "../../shared/TaoDashboardNavTabs"
import { TaoDashboardSubnetBreadcrumb } from "../TaoDashboardSubnetBreadcrumb"
import { SubnetTaoFlowChart } from "./flow-chart/SubnetTaoFlowChart"
import { SubnetPriceChart } from "./price-chart/SubnetPriceChart"

interface SubnetChartTabsProps {
  netuid: number
  className?: string
}

type ChartTab = "price" | "flow"

export const SubnetCharts: FC<SubnetChartTabsProps> = ({ netuid, className }) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ChartTab>("price")

  const tabs = useMemo<NavTabConfig<ChartTab>[]>(
    () => [
      { value: "price", label: t("Price Trend") },
      { value: "flow", label: t("Tao Flow") },
    ],
    [t]
  )

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex items-center justify-between">
        <TaoDashboardSubnetBreadcrumb netuid={netuid} />
        <TaoDashboardNavTabs tabs={tabs} selected={activeTab} onSelect={setActiveTab} />
      </div>

      <div className="h-[32.5rem] overflow-hidden rounded-lg bg-grey-900">
        {/* Chart Content */}
        {activeTab === "price" ? (
          <SubnetPriceChart netuid={netuid} />
        ) : (
          <SubnetTaoFlowChart netuid={netuid} />
        )}
      </div>
    </div>
  )
}
