import { Balances } from "@talismn/balances"
import { cn } from "@talismn/util"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Outlet, useLocation, useOutletContext } from "react-router-dom"

import { SearchInput } from "@talisman/components/SearchInput"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { EarnTabs } from "@ui/domains/Earn/EarnTabs"
import { useYieldxyzOpportunitiesByTokenId } from "@ui/domains/Earn/yieldxyz/hooks/useYieldxyzOportunitiesByTokenId"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useSelectedCurrency } from "@ui/state"

import { DashboardEarnDiscoverTab } from "./DashboardEarnDiscoverTab"
import { DashboardEarnPositionsTab } from "./DashboardEarnPositionsTab"

type EarnTabKey = "assets" | "discover"

type DashboardEarnOutletContext = {
  search: string
}

const TAB_TO_PATH: Record<EarnTabKey, string> = {
  assets: "positions",
  discover: "discover",
}

const getTabFromPath = (pathname: string): EarnTabKey =>
  pathname.includes("/discover") ? "discover" : "assets"

const useDashboardEarnOutletContext = () => useOutletContext<DashboardEarnOutletContext>()

export const DashboardEarnPage: FC = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigateWithQuery()
  const selectedTab = useMemo<EarnTabKey>(
    () => getTabFromPath(location.pathname),
    [location.pathname],
  )
  const [search, setSearch] = useState("")

  const handleTabChange = useCallback(
    (tab: EarnTabKey) => {
      if (tab === selectedTab) return

      navigate(TAB_TO_PATH[tab])
    },
    [navigate, selectedTab],
  )

  const outletContext = useMemo<DashboardEarnOutletContext>(() => ({ search }), [search])

  return (
    <div className="text-body-secondary flex w-full min-w-[45rem] flex-col gap-6 overflow-hidden text-left text-base">
      {/* Header with total balance - always show */}
      <EarnPageHeader />

      {/* Tabs and Search in same row */}
      <div className="mb-6 flex w-full items-center justify-between overflow-hidden">
        <div className="flex-shrink-0">
          <EarnTabs
            onTabChange={handleTabChange}
            value={selectedTab}
            className="text-md my-0 h-14 w-auto font-bold"
          />
        </div>
        <div className="w-[28rem]">
          <SearchInput
            containerClassName="h-[3.6rem] w-full rounded-sm border !px-4 !bg-field ring-transparent focus-within:border-grey-700 border-field [&>svg]:size-8"
            className="text-sm"
            placeholder={t("Search")}
            onChange={setSearch}
            initialValue={search}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div>
        <Outlet context={outletContext} />
      </div>
    </div>
  )
}

export const DashboardEarnPositionsRoute: FC = () => {
  const { search } = useDashboardEarnOutletContext()

  useAnalyticsPageView({
    container: "Fullscreen",
    feature: "Earn Yield",
    featureVersion: 1,
    page: "Earn Positions",
  })

  return <DashboardEarnPositionsTab search={search} />
}

export const DashboardEarnDiscoverRoute: FC = () => {
  const { search } = useDashboardEarnOutletContext()

  useAnalyticsPageView({
    container: "Fullscreen",
    feature: "Earn Yield",
    featureVersion: 1,
    page: "Earn Discover",
  })

  return <DashboardEarnDiscoverTab search={search} />
}

const EarnPageHeader = () => {
  const { t } = useTranslation()
  const currency = useSelectedCurrency()

  // this hook already filters selected accounts
  const { status, data: tokenProducts } = useYieldxyzOpportunitiesByTokenId()

  const eligibleTotal = useMemo(() => {
    if (!tokenProducts) return null

    const allBalances = new Balances(tokenProducts?.flatMap((to) => to.balances.each) || [])
    return allBalances.sum.fiat(currency).transferable
  }, [currency, tokenProducts])

  return (
    <div className="text-body-secondary border-grey-800 flex justify-between rounded-[0.75rem] border text-left text-base">
      <div className="flex flex-col gap-4 px-6 py-8">
        <div className="text-body-secondary text-sm">{t("Yield-Eligible Capital")}</div>
        <div className="text-body text-2xl font-bold">
          {!eligibleTotal && status === "loading" ? (
            <div className="bg-grey-700 text-grey-700 animate-pulse rounded">$0.00</div>
          ) : (
            <Fiat amount={eligibleTotal} className={cn(status === "loading" && "animate-pulse")} />
          )}
        </div>
      </div>
    </div>
  )
}
