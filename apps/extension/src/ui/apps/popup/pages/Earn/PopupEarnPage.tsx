import { FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { SearchInput } from "@talisman/components/SearchInput"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useYieldBalances } from "@ui/domains/Earn/hooks/useYieldBalances"
import { setPortfolioSearch, usePortfolioSearch } from "@ui/state"

import { PopupEarnAssetsTab } from "./PopupEarnAssetsTab"
import { PopupEarnDiscoverTab } from "./PopupEarnDiscoverTab"
import { PopupEarnTabs } from "./PopupEarnTabs"

const PopupEarnHeader = () => {
  const { t } = useTranslation()
  const { totalUsd, isLoading } = useYieldBalances()

  const displayTotal = useMemo(() => {
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

export const PopupEarnPage: FC = () => {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState("assets")
  const search = usePortfolioSearch()

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab)
  }

  return (
    <div className="text-body-secondary w-full text-left text-base">
      {/* Header with total balance */}
      <PopupEarnHeader />

      {/* Tabs and Search */}
      <div className="mb-6 flex flex-col gap-4">
        <PopupEarnTabs onTabChange={handleTabChange} />
        <div className="w-full">
          <SearchInput
            containerClassName="!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-16 w-full border border-field text-xs !px-4"
            placeholder={t("Search DeFi positions")}
            onChange={setPortfolioSearch}
            initialValue={search}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-4">
        {selectedTab === "assets" && <PopupEarnAssetsTab />}
        {selectedTab === "discover" && <PopupEarnDiscoverTab />}
      </div>
    </div>
  )
}
