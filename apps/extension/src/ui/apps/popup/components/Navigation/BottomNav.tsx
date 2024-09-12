import { HistoryIcon, ZapIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, ReactNode, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import { useOpenClose } from "talisman-ui"

import { TALISMAN_WEB_APP_STAKING_URL } from "@extension/shared"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useSelectedAccount } from "@ui/domains/Portfolio/useSelectedAccount"
import { PendingTransactionsDrawer } from "@ui/domains/Transactions/PendingTransactionsDrawer"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { usePopupNavOpenClose } from "@ui/hooks/usePopupNavOpenClose"

import { NavIconClose, NavIconExpand, NavIconLogo, NavIconMenu } from "./icons"
import {
  QuickSettingsModal,
  QuickSettingsOverlay,
  useQuickSettingsOpenClose,
} from "./QuickSettings"

const NavButton: FC<{
  label: ReactNode
  icon: FC<{ className?: string }>
  className?: string
  withBadge?: boolean
  onClick: () => void
}> = ({ label, icon: Icon, withBadge, className, onClick }) => {
  return (
    <button
      type="button"
      className={classNames(
        "group",
        "text-body-disabled h-20 w-20",
        "enabled:hover:text-body-secondary",
        "enabled:focus-visible:border",
        className
      )}
      onClick={onClick}
    >
      <div
        className={classNames(
          "flex size-full flex-col items-center justify-center gap-[0.15rem]",
          "translate-y-4 transition-transform group-hover:translate-y-0"
        )}
      >
        {withBadge ? (
          <div className="relative size-10">
            <Icon className="size-10" />
            <div className="bg-primary absolute -right-1 -top-1 size-3 rounded-full"></div>
          </div>
        ) : (
          <Icon className="size-10" />
        )}
        <div
          className={classNames(
            "leading-paragraph text-[1rem]",
            "opacity-0 transition-opacity group-hover:opacity-100"
          )}
        >
          {label}
        </div>
      </div>
    </button>
  )
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Navigation",
  featureVersion: 3,
  page: "Portfolio",
}

const RecentActivityButton = () => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  // const hasPendingTransactions = useLiveQuery(
  //   async () => !!(await db.transactions.where("status").equals("pending").count()),
  //   []
  // )

  const handleClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Interact",
      action: "Recent activity button",
    })
    open()
  }, [open])

  return (
    <>
      <NavButton
        label={t("History")}
        icon={HistoryIcon} // hasPendingTransactions ? NavIconActivityPending : HistoryIcon
        onClick={handleClick}
      />
      <PendingTransactionsDrawer isOpen={isOpen} onClose={close} />
    </>
  )
}

export const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { account } = useSelectedAccount()
  const { open } = usePopupNavOpenClose()
  const { close: closeQuickSettings, isOpen: isQuickSettingsOpen } = useQuickSettingsOpenClose()

  const handleHomeClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Home button",
    })
    navigate("/portfolio")
    closeQuickSettings()
  }, [closeQuickSettings, navigate])

  const handleStakingClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Staking button",
    })
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
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

  const { allBackedUp } = useMnemonicBackup()

  const { t } = useTranslation()

  return (
    <>
      <div className="h-32 shrink-0">{/* Placeholder for nav height */}</div>
      <QuickSettingsOverlay />

      <div className="absolute bottom-0 left-0 z-20 flex w-full flex-col justify-center gap-6 px-8 pb-6">
        <QuickSettingsModal />
        <div
          className={classNames(
            "border-grey-800 flex h-[5.2rem] w-full items-center justify-between rounded border bg-black/90 px-7 backdrop-blur-[2px]"
          )}
        >
          <NavButton
            label={t("Portfolio")}
            className="!text-white"
            icon={NavIconLogo}
            onClick={handleHomeClick}
          />
          <NavButton label={t("Staking")} icon={ZapIcon} onClick={handleStakingClick} />
          <RecentActivityButton />
          <NavButton label={t("Fullscreen")} icon={NavIconExpand} onClick={handleExpandClick} />
          {isQuickSettingsOpen ? (
            <NavButton
              label={t("Close")}
              icon={NavIconClose}
              onClick={closeQuickSettings}
              className="!text-white"
            />
          ) : (
            <NavButton
              label={t("More")}
              icon={NavIconMenu}
              onClick={handleMoreClick}
              withBadge={!allBackedUp}
            />
          )}
        </div>
      </div>
    </>
  )
}
