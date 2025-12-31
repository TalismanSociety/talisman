import { Balances } from "@talismn/balances"
import { cn } from "@talismn/util"
import { FC, PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Outlet, useLocation, useOutletContext } from "react-router-dom"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { EarnTabs } from "@ui/domains/Earn/components/EarnTabs"
import { useYieldxyzOpportunitiesByTokenId } from "@ui/domains/Earn/yieldxyz/hooks/useYieldxyzOpportunitiesByTokenId"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useSelectedCurrency } from "@ui/state"

import { BottomNav } from "../../components/Navigation/BottomNav"
import { NavigationDrawer } from "../../components/Navigation/NavigationDrawer"
import { PopupEarnDiscoverTab } from "./PopupEarnDiscoverTab"
import { PopupEarnPositionsTab } from "./PopupEarnPositionsTab"

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

const PageHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full shrink-0 flex-col px-4 pt-8">
      <div className="text-body text-lg font-bold">{t("Earn")}</div>
    </div>
  )
}

const PopupEarnHeader = () => {
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
    <div className="text-body-secondary bg-grey-850 border-grey-800 flex justify-between rounded-[0.75rem] border text-left text-base">
      <div className="flex flex-col gap-4 px-6 py-8">
        <div className="text-body-secondary text-xs">{t("Yield-Eligible Capital")}</div>
        <div className="text-body text-xl font-bold">
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

export const PopupEarnPage: FC = () => {
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
    <>
      <Content>
        <div className="text-body-secondary flex w-full flex-col gap-6 text-left text-base">
          {/* Page Header */}
          <PageHeader />

          {/* Header with total balance */}
          <PopupEarnHeader />

          {/* Tabs and Search */}
          <div className="flex flex-col gap-4">
            <EarnTabs onTabChange={handleTabChange} value={selectedTab} />
            <div className="w-full">
              <SearchInput
                containerClassName="!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-16 w-full border border-field text-xs !px-4"
                className="text-xs"
                placeholder={t("Search DeFi positions")}
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
        <BottomNav />
      </Content>
      <NavigationDrawer />
    </>
  )
}

const Content: FC<PropsWithChildren> = ({ children }) => {
  //scrollToTop on location change
  const scrollableRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    scrollableRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <ScrollContainer ref={scrollableRef} className="size-full overflow-hidden px-8">
      {children}
    </ScrollContainer>
  )
}

export const PopupEarnPositionsRoute: FC = () => {
  const { search } = useDashboardEarnOutletContext()

  useAnalyticsPageView({
    container: "Popup",
    feature: "Earn",
    featureVersion: 1,
    page: "Earn Positions",
  })

  return <PopupEarnPositionsTab search={search} />
}

export const PopupEarnDiscoverRoute: FC = () => {
  const { search } = useDashboardEarnOutletContext()

  useAnalyticsPageView({
    container: "Popup",
    feature: "Earn",
    featureVersion: 1,
    page: "Earn Discover",
  })

  return <PopupEarnDiscoverTab search={search} />
}
