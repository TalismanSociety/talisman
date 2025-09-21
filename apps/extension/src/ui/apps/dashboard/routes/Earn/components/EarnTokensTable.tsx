import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { usePortfolioDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useSelectedCurrency } from "@ui/state"

import { EarnAssetsTab } from "./EarnAssetsTab"
import { EarnDiscoverTab } from "./EarnDiscoverTab"
import { EarnTabs } from "./EarnTabs"

const EarnHeaderRow = () => {
  const balances = usePortfolioDisplayBalances("network")
  const { t } = useTranslation()
  const currency = useSelectedCurrency()

  const { total: portfolio } = useMemo(() => balances.sum.fiat(currency), [balances.sum, currency])

  return (
    <div className="text-body-secondary bg-grey-850 mb-4 flex h-40 items-center justify-between rounded px-8 text-left text-base">
      <div className="flex flex-col gap-4">
        <div className="text-body-secondary text-sm">{t("Total Earn Portfolio")}</div>
        <div className="text-body text-2xl font-bold">
          {portfolio === null ? "-" : <Fiat amount={portfolio} isBalance />}
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
