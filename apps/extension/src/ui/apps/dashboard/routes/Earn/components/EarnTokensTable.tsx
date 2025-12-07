import { cn } from "@talismn/util"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { SearchInput } from "@talisman/components/SearchInput"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useYieldBalancesGrouped } from "@ui/domains/Earn/hooks/useYieldBalancesGrouped"
import { useAccounts } from "@ui/state"
import {
  setDiscoverSearch,
  setYieldSearch,
  useDiscoverSearch,
  useYieldSearch,
} from "@ui/state/yield"

import { EarnAssetsTab } from "./EarnAssetsTab"
import { EarnDiscoverTab } from "./EarnDiscoverTab"
import { EarnTabs } from "./EarnTabs"

const EarnHeaderRow = () => {
  const { t } = useTranslation()
  const yieldBalancesGrouped = useYieldBalancesGrouped()
  const accounts = useAccounts("owned")

  // Get owned account addresses to filter out watched accounts (kept for parity; not used)
  useMemo(() => new Set(accounts.map((account) => account.address)), [accounts])

  // Calculate total from Yield balances (excluding watch-only accounts)
  const displayTotal = useMemo(() => {
    if (yieldBalancesGrouped.data) {
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
          {!displayTotal && isLoading ? (
            <div className="bg-grey-700 text-grey-700 animate-pulse rounded">$0.00</div>
          ) : (
            <Fiat
              amount={displayTotal}
              forceCurrency="usd"
              className={cn(isLoading && "animate-pulse")}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export const EarnTokensTable = () => {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState("assets")
  const assetsSearch = useYieldSearch()
  const discoverSearch = useDiscoverSearch()

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab)
  }

  return (
    <div className="text-body-secondary flex min-w-[45rem] flex-col gap-6 text-left text-base">
      {/* Header with total balance - always show */}
      <EarnHeaderRow />

      {/* Tabs and Search in same row */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex-shrink-0">
          <EarnTabs onTabChange={handleTabChange} />
        </div>
        {selectedTab === "assets" && (
          <div className="w-[28rem]">
            <SearchInput
              containerClassName="!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-16 w-full border border-field text-xs !px-4"
              placeholder={t("Search DeFi positions")}
              onChange={setYieldSearch}
              initialValue={assetsSearch}
            />
          </div>
        )}
        {selectedTab === "discover" && (
          <div className="w-[28rem]">
            <SearchInput
              containerClassName="!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-16 w-full border border-field text-xs !px-4"
              placeholder={t("Search for assets")}
              onChange={setDiscoverSearch}
              initialValue={discoverSearch}
            />
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div>
        {selectedTab === "assets" && <EarnAssetsTab />}
        {selectedTab === "discover" && <EarnDiscoverTab />}
      </div>
    </div>
  )
}
