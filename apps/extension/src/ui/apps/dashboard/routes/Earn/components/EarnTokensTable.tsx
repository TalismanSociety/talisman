import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { SearchInput } from "@talisman/components/SearchInput"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useYieldBalances } from "@ui/domains/Earn/hooks/useYieldBalances"
import { setPortfolioSearch, useAccounts, usePortfolioSearch } from "@ui/state"

import { EarnAssetsTab } from "./EarnAssetsTab"
import { EarnDiscoverTab } from "./EarnDiscoverTab"
import { EarnTabs } from "./EarnTabs"

const EarnHeaderRow = () => {
  const { t } = useTranslation()
  const { totalUsd, isLoading } = useYieldBalances()
  const accounts = useAccounts("owned")

  // Get owned account addresses to filter out watched accounts (kept for parity; not used)
  useMemo(() => new Set(accounts.map((account) => account.address)), [accounts])

  // Calculate total from Yield balances (excluding watch-only accounts)
  const displayTotal = useMemo(() => {
    // totalUsd is already aggregated across all accounts from useYieldBalances
    return Number(totalUsd || 0)
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
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState("assets")
  const search = usePortfolioSearch()

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab)
  }

  return (
    <div className="text-body-secondary min-w-[45rem] text-left text-base">
      {/* Header with total balance - always show */}
      <EarnHeaderRow />

      {/* Tabs and Search in same row */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex-shrink-0">
          <EarnTabs onTabChange={handleTabChange} />
        </div>
        <div className="w-[28rem]">
          <SearchInput
            containerClassName="!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-16 w-full border border-field text-xs !px-4"
            placeholder={t("Search DeFi positions")}
            onChange={setPortfolioSearch}
            initialValue={search}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {selectedTab === "assets" && <EarnAssetsTab />}
        {selectedTab === "discover" && <EarnDiscoverTab />}
      </div>
    </div>
  )
}
