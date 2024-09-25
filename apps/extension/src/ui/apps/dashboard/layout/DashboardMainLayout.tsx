import { HistoryIcon, MenuIcon, TalismanHandIcon, UsersIcon, ZapIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { TALISMAN_WEB_APP_STAKING_URL } from "extension-shared"
import { FC, ReactNode, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useMatch, useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { LogoDashboard } from "@talisman/theme/logos"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { BuildVersionPill } from "@ui/domains/Build/BuildVersionPill"

import { PortfolioSidebar } from "./PortfolioSidebar"

// const BigBlock = () => <div className="bg-green/50 border-green size-[80rem] border-2"></div>

const RESPONSIVE_FLEX_SPACING = classNames("gap-5 px-5", "md:gap-10 md:px-10", "lg:gap-20 lg:px-20")

const Header = () => (
  <div
    className={classNames(
      "sticky left-0 top-0 z-30 flex h-48 w-full items-center justify-between bg-gradient-to-b from-black via-black via-80% to-transparent ",
      RESPONSIVE_FLEX_SPACING
    )}
  >
    <div className="hidden h-48 shrink-0 items-center gap-4 sm:flex">
      <LogoDashboard className="h-[3rem] w-[14.7172rem]" />
      <BuildVersionPill className="bg-primary/5 text-primary hover:bg-primary/20 rounded-3xl" />
    </div>
    <HorizontalNav />
    <IconButton>
      <MenuIcon />
    </IconButton>
  </div>
)
// dynamic max height to apply on sidebar : max-h-[calc(100dvh-13.6rem)]
export const DashboardMainLayout: FC<{ children?: ReactNode }> = ({ children }) => {
  return (
    <div id="main" className="relative h-dvh w-dvw overflow-scroll">
      <Header />
      <div className="absolute left-5 top-48  w-[29.6rem] overflow-hidden md:left-10 lg:left-20">
        <PortfolioSidebar />
      </div>
      <div className="ml-[30.6rem] md:ml-[31.6rem] lg:ml-[33.6rem]">
        <div className={classNames("flex w-full", RESPONSIVE_FLEX_SPACING)}>
          <div className="flex grow justify-center">
            <div className="max-w-[120rem] grow">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const NavButton: FC<{
  label: ReactNode
  icon: FC<{ className?: string }>
  route?: string
  className?: string
  onClick: () => void
}> = ({ label, icon: Icon, route, className, onClick }) => {
  const routeMatch = useMatch(route ?? "")

  return (
    <button
      type="button"
      className={classNames(
        "text-body-disabled hover:text-body-secondary flex items-center gap-4",
        routeMatch && "!text-body",
        className
      )}
      onClick={onClick}
    >
      <Icon className="shrink-0 text-[2rem]" />
      <div className="hidden lg:block">{label}</div>
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

  const navigate = useNavigate()
  const handlePortfolioClick = () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Portfolio button",
    })
    navigate("/portfolio")
  }

  const handleStakingClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Staking button",
    })
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
  }, [])

  const NO_OP = () => {}

  return (
    <div className="border-grey-800 flex h-24 gap-16 rounded-lg border px-8">
      <NavButton
        label={t("Portfolio")}
        onClick={handlePortfolioClick}
        route="/portfolio/*"
        icon={TalismanHandIcon}
      />
      <NavButton label={t("Staking")} onClick={handleStakingClick} icon={ZapIcon} />
      <NavButton label={t("Activity")} onClick={NO_OP} icon={HistoryIcon} />
      <NavButton label={t("Address Book")} onClick={NO_OP} icon={UsersIcon} />
    </div>
  )
}
