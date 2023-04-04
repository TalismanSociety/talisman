import { db } from "@core/db"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { PendingTransactionsDrawer } from "@ui/domains/Transactions/PendingTransactionsDrawer"
import { useLiveQuery } from "dexie-react-hooks"
import { ButtonHTMLAttributes, DetailedHTMLProps, FC, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { useNavigationContext } from "../../context/NavigationContext"
import {
  NavIconActivity,
  NavIconActivityPending,
  NavIconExpand,
  NavIconHome,
  NavIconMore,
  NavIconNft,
} from "./icons"

type BottomNavButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  current?: boolean
}

const BottomNavButton: FC<BottomNavButtonProps> = ({ current, className, children, ...props }) => (
  <button
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

  return (
    <>
      <Tooltip placement="top">
        <TooltipTrigger>
          <BottomNavButton onClick={handleClick}>
            {hasPendingTransactions ? <NavIconActivityPending /> : <NavIconActivity />}
          </BottomNavButton>
        </TooltipTrigger>
        <TooltipContent>Recent activity</TooltipContent>
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
    window.open("https://app.talisman.xyz/portfolio/nfts", "_blank")
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

  return (
    <div className="border-t-grey-800 flex h-32 min-h-[6.4rem] items-center justify-between border-t px-12 text-3xl">
      <Tooltip placement="top">
        <TooltipTrigger>
          <BottomNavButton onClick={handleHomeClick} current={location.pathname === "/portfolio"}>
            <NavIconHome />
          </BottomNavButton>
        </TooltipTrigger>
        <TooltipContent>Portfolio</TooltipContent>
      </Tooltip>
      <Tooltip placement="top">
        <TooltipTrigger>
          <BottomNavButton onClick={handleNftClick}>
            <NavIconNft />
          </BottomNavButton>
        </TooltipTrigger>
        <TooltipContent>View NFTs</TooltipContent>
      </Tooltip>
      <RecentActivityButton />
      <Tooltip placement="top">
        <TooltipTrigger>
          <BottomNavButton onClick={handleExpandClick}>
            <NavIconExpand />
          </BottomNavButton>
        </TooltipTrigger>
        <TooltipContent>Expand Portfolio View</TooltipContent>
      </Tooltip>
      <Tooltip placement="top">
        <TooltipTrigger>
          <BottomNavButton onClick={handleMoreClick}>
            <NavIconMore />
          </BottomNavButton>
        </TooltipTrigger>
        <TooltipContent>More Options</TooltipContent>
      </Tooltip>
    </div>
  )
}
