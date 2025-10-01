import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { useYieldBalances } from "@ui/domains/Earn/hooks/useYieldBalances"

import { EarnAssetsTab } from "./EarnAssetsTab"
import { EarnDiscoverTab } from "./EarnDiscoverTab"
import { EarnTabs } from "./EarnTabs"

const EarnHeaderRow = () => {
  const { t } = useTranslation()
  const { totalUsd, isLoading } = useYieldBalances()

  // Convert USD total to selected currency if needed
  const displayTotal = useMemo(() => {
    // Convert string to number for Fiat component
    return parseFloat(totalUsd) || 0
  }, [totalUsd])

  return (
    <div className="text-body-secondary bg-grey-850 mb-4 flex h-40 items-center justify-between rounded px-8 text-left text-base">
      <div className="flex flex-col gap-4">
        <div className="text-body-secondary text-sm">{t("Total Earn Assets")}</div>
        <div className="text-body text-2xl font-bold">
          {isLoading ? (
            <div className="bg-grey-700 h-8 w-32 animate-pulse rounded"></div>
          ) : (
            <Fiat amount={displayTotal} />
          )}
        </div>
      </div>
    </div>
  )
}

export const EarnTokensTable = () => {
  const [selectedTab, setSelectedTab] = useState("assets")

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab)
  }

  return (
    <div className="text-body-secondary min-w-[45rem] text-left text-base">
      {/* Header with total balance - always show */}
      <EarnHeaderRow />

      {/* Tabs */}
      <div className="mb-6">
        <EarnTabs onTabChange={handleTabChange} />
      </div>

      {/* Tab Content */}
      <div>
        {selectedTab === "assets" && <EarnAssetsTab />}
        {selectedTab === "discover" && <EarnDiscoverTab />}
      </div>
    </div>
  )
}
