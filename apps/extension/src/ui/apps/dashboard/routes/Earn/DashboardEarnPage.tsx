import { SearchInput } from "@talisman/components/SearchInput"
import { Balances } from "@talismn/balances"
import { cn } from "@talismn/util"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { EarnTabsDashboard } from "@ui/domains/Earn/components/EarnTabsDashboard"
import { useYieldxyzOpportunitiesByTokenId } from "@ui/domains/Earn/yieldxyz/hooks/useYieldxyzOpportunitiesByTokenId"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useSelectedCurrency } from "@ui/state"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Outlet, useOutletContext } from "react-router-dom"
import { DashboardEarnDiscoverTab } from "./DashboardEarnDiscoverTab"
import { DashboardEarnPositionsTab } from "./DashboardEarnPositionsTab"

type DashboardEarnOutletContext = {
  search: string
}

const useDashboardEarnOutletContext = () => useOutletContext<DashboardEarnOutletContext>()

export const DashboardEarnPage: FC = () => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const outletContext = useMemo<DashboardEarnOutletContext>(() => ({ search }), [search])

  return (
    <div className="flex w-full min-w-[45rem] flex-col gap-6 overflow-hidden text-left text-base text-body-secondary">
      {/* Header with total balance - always show */}
      <EarnPageHeader />

      {/* Tabs and Search in same row */}
      <div className="mb-6 flex w-full items-center justify-between overflow-hidden">
        <div className="flex-shrink-0">
          <EarnTabsDashboard />
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
    feature: "Earn",
    featureVersion: 1,
    page: "Earn Positions",
  })

  return <DashboardEarnPositionsTab search={search} />
}

export const DashboardEarnDiscoverRoute: FC = () => {
  const { search } = useDashboardEarnOutletContext()

  useAnalyticsPageView({
    container: "Fullscreen",
    feature: "Earn",
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
    <div className="flex h-64 items-center justify-between rounded-[0.75rem] border border-grey-800 text-left text-base text-body-secondary">
      <div className="flex flex-col gap-4 px-6 py-8">
        <div className="text-body-secondary text-sm">{t("Yield-Eligible Capital")}</div>
        <div className="font-bold text-2xl text-body">
          {!eligibleTotal && status === "loading" ? (
            <div className="animate-pulse rounded bg-grey-700 text-grey-700">$0.00</div>
          ) : (
            <Fiat amount={eligibleTotal} className={cn(status === "loading" && "animate-pulse")} />
          )}
        </div>
      </div>
    </div>
  )
}
