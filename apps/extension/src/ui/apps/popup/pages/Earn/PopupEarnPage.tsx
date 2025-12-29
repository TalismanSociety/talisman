import { FC, PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Outlet, useLocation, useOutletContext } from "react-router-dom"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { EarnTabs } from "@ui/domains/Earn/EarnTabs"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useYieldxyzPositionsEnhanced } from "@ui/state/yieldxyz"

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
    <div className="flex w-full shrink-0 flex-col px-4 pt-4">
      <div className="text-body text-lg font-bold">{t("Earn")}</div>
    </div>
  )
}

const PopupEarnHeader = () => {
  const { t } = useTranslation()
  const yieldBalancesGrouped = useYieldxyzPositionsEnhanced()

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
    <div id="main" className="relative size-full overflow-hidden">
      <Content>
        <div className="text-body-secondary flex w-full flex-col gap-6 text-left text-base">
          {/* Page Header */}
          <PageHeader />

          {/* Header with total balance */}
          <PopupEarnHeader />

          {/* Tabs and Search */}
          <div className="mb-6 flex flex-col gap-4">
            <EarnTabs onTabChange={handleTabChange} value={selectedTab} />
            {/* {selectedTab === "assets" && ( */}
            <div className="w-full">
              <SearchInput
                containerClassName="!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-16 w-full border border-field text-xs !px-4"
                placeholder={t("Search DeFi positions")}
                onChange={setSearch}
                initialValue={search}
              />
            </div>
          </div>

          {/* Tab Content */}
          <div className="pb-4">
            <Outlet context={outletContext} />
          </div>
        </div>
        <BottomNav />
      </Content>
      <NavigationDrawer />
    </div>
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
    container: "Fullscreen",
    feature: "Earn Yield",
    featureVersion: 1,
    page: "Earn Positions",
  })

  return <PopupEarnPositionsTab search={search} />
}

export const PopupEarnDiscoverRoute: FC = () => {
  const { search } = useDashboardEarnOutletContext()

  useAnalyticsPageView({
    container: "Fullscreen",
    feature: "Earn Yield",
    featureVersion: 1,
    page: "Earn Discover",
  })

  return <PopupEarnDiscoverTab search={search} />
}
