import { AlertCircleIcon, HistoryIcon, ZapIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useLiveQuery } from "dexie-react-hooks"
import { ButtonHTMLAttributes, DetailedHTMLProps, forwardRef, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { db } from "@extension/core"
import { TALISMAN_WEB_APP_STAKING_URL, TALISMAN_WEB_APP_SWAP_URL } from "@extension/shared"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { PendingTransactionsDrawer } from "@ui/domains/Transactions/PendingTransactionsDrawer"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { usePopupNavOpenClose } from "@ui/hooks/usePopupNavOpenClose"
import { useSearchParamsSelectedFolder } from "@ui/hooks/useSearchParamsSelectedFolder"

import { NavIconActivityPending, NavIconLogo, NavIconMenu, NavIconSwap } from "./icons"

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
        " text-body-disabled flex h-20 w-20 items-center justify-center rounded-sm text-center",
        "enabled:hover:text-body",
        "enabled:active:text-body enabled:focus-visible:border",
        current && "allow-focus && text-white",
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
            {hasPendingTransactions ? (
              <NavIconActivityPending className="size-10" />
            ) : (
              <HistoryIcon className="size-10" />
            )}
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
  const { folder } = useSearchParamsSelectedFolder()
  //const { account } = useSelectedAccount()
  const { open } = usePopupNavOpenClose()

  const handleHomeClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Home button",
    })
    navigate("/portfolio")
  }, [navigate])

  const handleStakingClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Staking button",
    })
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
    window.close()
  }, [])

  const handleSwapClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Swap button",
    })
    window.open(TALISMAN_WEB_APP_SWAP_URL, "_blank")
    window.close()
  }, [])

  // const handleExpandClick = useCallback(() => {
  //   sendAnalyticsEvent({
  //     ...ANALYTICS_PAGE,
  //     name: "Goto",
  //     action: "Fullscreen button",
  //   })
  //   // assume paths are the same in dashboard
  //   // portfolio pages expect an account argument to stay in sync with popup
  //   const qs = `?account=${account?.address ?? "all"}`
  //   api.dashboardOpen(`${location.pathname}${qs}`)
  //   window.close()
  // }, [account, location.pathname])

  const handleMoreClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Interact",
      action: "More button",
    })
    open()
  }, [open])

  const {
    showBackupWarningBanner,
    //  allBackedUp
  } = useMnemonicBackup()

  const { t } = useTranslation()

  return (
    <>
      {showBackupWarningBanner && (
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
      <div className="h-28 shrink-0">{/* Placeholder for nav height */}</div>
      <div className="absolute bottom-0 left-0 flex h-36 w-full flex-col justify-center px-8 ">
        <div className="border-grey-800 flex h-[5.2rem] w-full items-center justify-evenly rounded border bg-black/90 backdrop-blur-[2px]">
          <Tooltip placement="top">
            <TooltipTrigger asChild>
              <BottomNavButton
                onClick={handleHomeClick}
                current={location.pathname === "/portfolio" && folder === undefined}
              >
                <NavIconLogo className="size-10" />
              </BottomNavButton>
            </TooltipTrigger>
            <TooltipContent>{t("Portfolio")}</TooltipContent>
          </Tooltip>
          <Tooltip placement="top">
            <TooltipTrigger asChild>
              <BottomNavButton onClick={handleSwapClick}>
                <NavIconSwap className="size-10" />
              </BottomNavButton>
            </TooltipTrigger>
            <TooltipContent>{t("Swap")}</TooltipContent>
          </Tooltip>
          <RecentActivityButton />
          <Tooltip placement="top">
            <TooltipTrigger asChild>
              <BottomNavButton onClick={handleStakingClick}>
                <ZapIcon className="size-10" />
              </BottomNavButton>
            </TooltipTrigger>
            <TooltipContent>{t("Staking")}</TooltipContent>
          </Tooltip>

          {/* <Tooltip placement="top">
            <TooltipTrigger asChild>
              <BottomNavButton onClick={handleExpandClick}>
                <NavIconExpand />
              </BottomNavButton>
            </TooltipTrigger>
            <TooltipContent>{t("Fullscreen View")}</TooltipContent>
          </Tooltip> */}
          <Tooltip placement="top">
            <TooltipTrigger asChild>
              <BottomNavButton onClick={handleMoreClick}>
                <NavIconMenu className="size-10" />
                {/* {!allBackedUp && <NavIconMoreAlert />}
                {allBackedUp && <NavIconMore />} */}
              </BottomNavButton>
            </TooltipTrigger>
            <TooltipContent>{t("More Options")}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  )
}
