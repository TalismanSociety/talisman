import { FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { SearchInput } from "@talisman/components/SearchInput"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useYieldBalancesGrouped } from "@ui/domains/Earn/hooks/useYieldBalancesGrouped"
import { setYieldSearch, useYieldSearch } from "@ui/state/yield"

import { PopupEarnAssetsTab } from "./PopupEarnAssetsTab"
import { PopupEarnDiscoverTab } from "./PopupEarnDiscoverTab"
import { PopupEarnTabs } from "./PopupEarnTabs"

const PageHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full shrink-0 flex-col px-4">
      <div className="text-body text-lg font-bold">{t("Earn")}</div>
    </div>
  )
}

const PopupEarnHeader = () => {
  const { t } = useTranslation()
  const yieldBalancesGrouped = useYieldBalancesGrouped()

  const displayTotal = useMemo(() => {
    if (yieldBalancesGrouped.status === "success" && yieldBalancesGrouped.data) {
      return yieldBalancesGrouped.data.reduce((total, position) => {
        return (
          total +
          position.balances.reduce((posTotal, balance) => {
            return posTotal + parseFloat(balance.amountUsd || "0")
          }, 0)
        )
      }, 0)
    }
    return 0
  }, [yieldBalancesGrouped])

  const isLoading = yieldBalancesGrouped.status === "loading"

  return (
    <div className="text-body-secondary bg-grey-850 border-grey-800 flex justify-between rounded-[0.75rem] border text-left text-base">
      <div className="flex flex-col gap-4 px-6 py-8">
        <div className="text-body-secondary text-sm">{t("Yield-Eligible Capital")}</div>
        <div className="text-body text-2xl font-bold">
          {isLoading ? (
            <div className="bg-grey-700 h-8 w-32 animate-pulse rounded"></div>
          ) : (
            <Fiat amount={displayTotal} forceCurrency="usd" />
          )}
        </div>
      </div>
    </div>
  )
}

export const PopupEarnPage: FC = () => {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState("assets")
  const search = useYieldSearch()

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab)
  }

  return (
    <div className="text-body-secondary flex w-full flex-col gap-6 text-left text-base">
      {/* Page Header */}
      <PageHeader />

      {/* Header with total balance */}
      <PopupEarnHeader />

      {/* Tabs and Search */}
      <div className="mb-6 flex flex-col gap-4">
        <PopupEarnTabs onTabChange={handleTabChange} />
        {selectedTab === "assets" && (
          <div className="w-full">
            <SearchInput
              containerClassName="!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-16 w-full border border-field text-xs !px-4"
              placeholder={t("Search DeFi positions")}
              onChange={setYieldSearch}
              initialValue={search}
            />
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="pb-4">
        {selectedTab === "assets" && <PopupEarnAssetsTab />}
        {selectedTab === "discover" && <PopupEarnDiscoverTab />}
      </div>
    </div>
  )
}
