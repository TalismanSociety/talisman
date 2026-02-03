import { cn } from "@talismn/util"
import {
  type NavTabConfig,
  TaoDashboardNavTabs,
} from "@ui/domains/TaoDashboard/shared/TaoDashboardNavTabs"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { TabSignals } from "./TabSignals"
import { TabSocialFeeds } from "./TabSocialFeeds"
import { TabWhaleActivity } from "./TabWhalesActivity"

type TabType = "signals" | "social" | "whale"

export const TaoDashboardSidebar: FC<{
  netuid: number
  className?: string
}> = ({ netuid, className }) => {
  const [activeTab, setActiveTab] = useState<TabType>("signals")

  return (
    <div className={cn("flex flex-col gap-5 rounded-lg p-5 pt-0", className)}>
      <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
      <TabContent netuid={netuid} activeTab={activeTab} />
    </div>
  )
}

const TabSelector: FC<{
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation()

  const tabs = useMemo<NavTabConfig<TabType>[]>(
    () => [
      { value: "signals", label: t("Signals") },
      { value: "social", label: t("Social Feeds") },
      { value: "whale", label: t("Whale Activity") },
    ],
    [t]
  )

  return <TaoDashboardNavTabs tabs={tabs} selected={activeTab} onSelect={onTabChange} />
}

const TabContent: FC<{
  netuid: number
  activeTab: TabType
}> = ({ netuid, activeTab }) => {
  switch (activeTab) {
    case "signals":
      return <TabSignals netuid={netuid} />
    case "social":
      return <TabSocialFeeds netuid={netuid} />
    case "whale":
      return <TabWhaleActivity netuid={netuid} />
  }
}
