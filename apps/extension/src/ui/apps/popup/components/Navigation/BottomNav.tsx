import { TALISMAN_WEB_APP_NFTS_URL } from "@core/constants"
import { db } from "@core/db"
import { AlertCircleIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { PendingTransactionsDrawer } from "@ui/domains/Transactions/PendingTransactionsDrawer"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useLiveQuery } from "dexie-react-hooks"
import { ButtonHTMLAttributes, DetailedHTMLProps, forwardRef, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { useNavigationContext } from "../../context/NavigationContext"
import {
  NavIconActivity,
  NavIconActivityPending,
  NavIconExpand,
  NavIconHome,
  NavIconMore,
  NavIconMoreAlert,
  NavIconNft,
} from "./icons"

type BottomNavButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  current?: boolean
}

const BottomNavButton = forwardRef<HTMLButtonElement, BottomNavButtonProps>(
  ({ current, className, children, ...props }, ref) => (
    <button
      type="button"
      ref={ref}
      {...props}
      className={classNames(
        " text-body-secondary flex h-20 w-20 justify-center rounded-sm text-center",
        "enabled:hover:bg-grey-800 enabled:hover:text-body",
        "enabled:focus-visible:border-body enabled:active:text-body",
        current && "allow-focus",
        className
      )}
      disabled={current}
    >
      {children}
    </button>
  )
)
BottomNavButton.displayName = "BottomNavButton"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Navigation",
  featureVersion: 3,
  page: "Portfolio",
}

const RecentActivityButton = () => {
  const hasPendingTransactions = useLiveQuery(
    async () => !!(await db.transactions.where("status").equals("pending").count()),
    []
  )
  const { isOpen, open, close } = useOpenClose()

  const handleClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Interact",
      action: "Recent activity button",
    })
    open()
  }, [open])

  const { t } = useTranslation()

  return (
    <>
      <Tooltip placement="top">
        <TooltipTrigger asChild>
          <BottomNavButton onClick={handleClick}>
            {hasPendingTransactions ? <NavIconActivityPending /> : <NavIconActivity />}
          </BottomNavButton>
        </TooltipTrigger>
        <TooltipContent>{t("Recent activity")}</TooltipContent>
      </Tooltip>
      <PendingTransactionsDrawer isOpen={isOpen} onClose={close} />
    </>
  )
}

export const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { account } = useSelectedAccount()
  const { open } = useNavigationContext()

  const handleHomeClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Home button",
    })
    navigate("/portfolio")
  }, [navigate])

  const handleNftClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "NFTs button",
    })
    window.open(TALISMAN_WEB_APP_NFTS_URL, "_blank")
    window.close()
  }, [])

  const handleExpandClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Fullscreen button",
    })
    // assume paths are the same in dashboard
    // portfolio pages expect an account argument to stay in sync with popup
    const qs = `?account=${account?.address ?? "all"}`
    api.dashboardOpen(`${location.pathname}${qs}`)
    window.close()
  }, [account, location.pathname])

  const handleMoreClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Interact",
      action: "More button",
    })
    open()
  }, [open])

  const { isSnoozed, isNotConfirmed } = useMnemonicBackup()

  const { t } = useTranslation()

  return (
    <>
      {isSnoozed && (
        <div className="bg-black-tertiary w-100 flex h-20 min-h-[4rem] items-center justify-center gap-4 px-4">
          <AlertCircleIcon className="text-primary-500 h-12 w-12" />
          <div className="text-body-secondary text-center text-xs">
            <Trans
              t={t}
              defaults="<Highlight>Backup your wallet</Highlight> to prevent losing access to your funds"
              components={{ Highlight: <span className="font-bold text-white" /> }}
            />
          </div>
        </div>
      )}
      <div className="border-t-grey-800 flex h-32 min-h-[6.4rem] items-center justify-between border-t px-12 text-3xl">
        <Tooltip placement="top">
          <TooltipTrigger asChild>
            <BottomNavButton onClick={handleHomeClick} current={location.pathname === "/portfolio"}>
              <NavIconHome />
            </BottomNavButton>
          </TooltipTrigger>
          <TooltipContent>{t("Portfolio")}</TooltipContent>
        </Tooltip>
        <Tooltip placement="top">
          <TooltipTrigger asChild>
            <BottomNavButton onClick={handleNftClick}>
              <NavIconNft />
            </BottomNavButton>
          </TooltipTrigger>
          <TooltipContent>{t("View NFTs")}</TooltipContent>
        </Tooltip>
        <RecentActivityButton />
        <Tooltip placement="top">
          <TooltipTrigger asChild>
            <BottomNavButton onClick={handleExpandClick}>
              <NavIconExpand />
            </BottomNavButton>
          </TooltipTrigger>
          <TooltipContent>{t("Expand Portfolio View")}</TooltipContent>
        </Tooltip>
        <Tooltip placement="top">
          <TooltipTrigger asChild>
            <BottomNavButton onClick={handleMoreClick}>
              {isNotConfirmed && <NavIconMoreAlert />}
              {!isNotConfirmed && <NavIconMore />}
            </BottomNavButton>
          </TooltipTrigger>
          <TooltipContent>{t("More Options")}</TooltipContent>
        </Tooltip>
      </div>
    </>
  )
}
