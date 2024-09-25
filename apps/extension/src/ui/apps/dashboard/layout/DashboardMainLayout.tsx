import { HistoryIcon, TalismanHandIcon, UsersIcon, ZapIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { TALISMAN_WEB_APP_STAKING_URL } from "extension-shared"
import { FC, ReactNode, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useMatch, useNavigate } from "react-router-dom"

import { LogoDashboard } from "@talisman/theme/logos"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { BuildVersionPill } from "@ui/domains/Build/BuildVersionPill"

import { PortfolioSidebar } from "./PortfolioSidebar"

// const BigBlock = () => <div className="bg-green/50 border-green size-[80rem] border-2"></div>

export const DashboardMainLayout: FC<{ children?: ReactNode }> = ({ children }) => {
  return (
    <div id="main" className="h-dvh w-dvw overflow-hidden">
      <div className="flex size-full overflow-hidden">
        <div className="flex h-full flex-col overflow-hidden px-20 pb-20">
          <div className="flex h-48 shrink-0 items-center gap-4">
            <LogoDashboard className="h-[3rem] w-[14.7172rem]" />
            <BuildVersionPill className="bg-primary/5 text-primary hover:bg-primary/20 rounded-3xl" />
          </div>
          <div className="@container w-[29.6rem] grow overflow-hidden">
            <PortfolioSidebar />
          </div>
          {/* <ScrollContainer className="w-[29.6rem] grow ">
            <BigBlock />
          </ScrollContainer> */}
        </div>
        <div className="relative h-full grow overflow-x-auto overflow-y-scroll">
          <div className="sticky left-0 top-0 z-30 flex h-48 w-full items-center justify-center bg-black">
            <HorizontalNav />
          </div>
          <div className="flex w-full min-w-fit justify-center">
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
        "text-hover text-body-disabled hover:text-body-secondary flex items-center gap-4",
        routeMatch && "!text-body",
        className
      )}
      onClick={onClick}
    >
      <Icon className="text-[2rem]" />
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
