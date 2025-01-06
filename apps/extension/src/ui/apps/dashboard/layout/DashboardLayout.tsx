import { HistoryIcon, SettingsIcon, TalismanHandIcon, ZapIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { TALISMAN_WEB_APP_STAKING_URL } from "extension-shared"
import { FC, ReactNode, Suspense, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { matchPath, useLocation, useNavigate, useSearchParams } from "react-router-dom"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { TalismanWhiteLogo } from "@talisman/theme/logos"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { BuildVersionPill } from "@ui/domains/Build/BuildVersionPill"

import { DashboardAccountsSidebar } from "./DashboardAccountsSidebar"
import { DashboardSettingsSidebar } from "./DashboardSettingsSidebar"
import { LayoutBreadcrumb } from "./LayoutBreadcrumb"
import { DashboardNotificationsAndModals } from "./notifications/DashboardNotificationsAndModals"

// dynamic max height to apply on sidebar : max-h-[calc(100dvh-13.6rem)]
export const DashboardLayout: FC<{
  children?: ReactNode
  sidebar: "accounts" | "settings"
}> = ({ children, sidebar }) => {
  return (
    <div id="main" className="h-dvh w-dvw overflow-x-auto overflow-y-scroll">
      <div className="relative mx-auto w-full max-w-[144rem]">
        <div className={classNames("flex w-full", RESPONSIVE_FLEX_SPACING)}>
          {/* Sidebar */}
          <div className="w-[29.6rem] shrink-0 overflow-hidden">
            <div className="hidden h-48 w-[29.6rem] shrink-0 items-center gap-4 sm:flex">
              <TalismanWhiteLogo className="h-[3rem] w-[14.7172rem]" />
              <BuildVersionPill className="bg-primary/5 text-primary hover:bg-primary/20 rounded-3xl" />
            </div>
            <Suspense fallback={<SuspenseTracker name="DashboardMainLayout.Sidebar" />}>
              {sidebar === "accounts" && <DashboardAccountsSidebar />}
              {sidebar === "settings" && <DashboardSettingsSidebar />}
            </Suspense>
          </div>
          {/* Main area */}
          <div className="flex grow flex-col items-center pb-20">
            <div className="flex h-48 w-full shrink-0 items-center justify-center">
              <HorizontalNav />
            </div>
            <Suspense fallback={<SuspenseTracker name="DashboardMainLayout.Content" />}>
              <div
                className={classNames(
                  // minimum width is automatically set by the horizontal nav bar which never shrinks
                  "animate-fade-in w-full grow",
                )}
              >
                <LayoutBreadcrumb />
                {children}
              </div>
            </Suspense>
          </div>
        </div>
      </div>
      <DashboardNotificationsAndModals />
    </div>
  )
}

const RESPONSIVE_FLEX_SPACING = classNames(
  "gap-5 px-5",
  "md:gap-10 md:px-10",
  "lg:gap-20 lg:px-20",
  "xl:gap-32 xl:px-32",
)

const NavButton: FC<{
  label: ReactNode
  icon: FC<{ className?: string }>
  route?: string | string[]
  className?: string
  onClick: () => void
}> = ({ label, icon: Icon, route, className, onClick }) => {
  const location = useLocation()
  const routeMatch = useMemo(() => {
    const matches = Array.isArray(route) ? route : ([route].filter(Boolean) as string[])
    return matches.some((route) => matchPath(route, location.pathname))
  }, [location.pathname, route])

  return (
    <button
      type="button"
      className={classNames(
        "text-body-inactive hover:text-body-secondary flex items-center gap-4",
        routeMatch && "!text-body",
        className,
      )}
      onClick={onClick}
    >
      <Icon className="shrink-0 text-[2rem]" />
      <div>{label}</div>
    </button>
  )
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Navigation",
  featureVersion: 3,
  page: "Portfolio",
}

const HorizontalNav = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()

  const navigate = useNavigate()
  const handlePortfolioClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Portfolio button",
    })
    navigate("/portfolio/tokens" + (searchParams.size ? `?${searchParams}` : ""))
  }, [navigate, searchParams])

  const handleStakingClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Staking button",
    })
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
  }, [])

  const handleActivityClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Activity button",
    })
    navigate("/tx-history" + (searchParams.size ? `?${searchParams}` : ""))
  }, [navigate, searchParams])

  const handleSettingsClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Settings button",
    })
    navigate("/settings/general")
  }, [navigate])

  return (
    <div className="border-grey-700 flex h-24 gap-16 rounded-lg border px-8">
      <NavButton
        label={t("Portfolio")}
        onClick={handlePortfolioClick}
        icon={TalismanHandIcon}
        route="/portfolio/*"
      />
      <NavButton label={t("Staking")} onClick={handleStakingClick} icon={ZapIcon} />
      <NavButton
        label={t("Activity")}
        onClick={handleActivityClick}
        icon={HistoryIcon}
        route="/tx-history"
      />
      <NavButton
        label={t("Settings")}
        onClick={handleSettingsClick}
        icon={SettingsIcon}
        route={["/settings/*", "/accounts/*"]}
      />
    </div>
  )
}
