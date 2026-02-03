import { cn } from "@talismn/util"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { type NavTabConfig, TaoDashboardNavTabs } from "../../shared/TaoDashboardNavTabs"
import { SubnetPriceChart } from "./SubnetPriceChart"
import { SubnetTaoFlowChart } from "./SubnetTaoFlowChart"

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
    <div className={cn("flex flex-col", className)}>
      <div>
        <TaoDashboardNavTabs tabs={tabs} selected={activeTab} onSelect={setActiveTab} />
      </div>

      <div className="h-[52rem] overflow-hidden rounded-lg bg-grey-850">
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
