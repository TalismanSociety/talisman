import { WithTooltip } from "@talisman/components/Tooltip"
import { AlertCircleIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { getTransactionHistoryUrl } from "@ui/util/getTransactionHistoryUrl"
import { ButtonHTMLAttributes, DetailedHTMLProps, FC, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { useNavigationContext } from "../../context/NavigationContext"
import {
  NavIconExpand,
  NavIconHistory,
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

const BottomNavButton: FC<BottomNavButtonProps> = ({ current, className, children, ...props }) => (
  <button
    {...props}
    className={classNames(
      " text-body-secondary flex h-20 w-20 justify-center rounded-sm text-center",
      "hover:bg-grey-800 hover:text-body",
      "allow-focus focus-visible:border-body active:text-body",
      current && "text-body",
      className
    )}
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

  const showTxHistory = useIsFeatureEnabled("LINK_TX_HISTORY")
  const handleTxHistoryClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Tx History button",
    })
    window.open(getTransactionHistoryUrl(account?.address), "_blank")
    window.close()
  }, [account?.address])

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

  return (
    <>
      {isSnoozed && (
        <div className="bg-black-tertiary w-100 flex h-20 min-h-[4rem] items-center justify-center gap-4 px-4">
          <AlertCircleIcon className="text-primary-500 h-12 w-12" />
          <div className="text-body-secondary text-center text-xs">
            <span className="font-bold text-white">Backup your wallet</span> to prevent losing
            access to your funds
          </div>
        </div>
      )}
      <div className="border-t-grey-800 flex h-32 min-h-[6.4rem] items-center justify-between border-t px-12 text-3xl">
        <WithTooltip as="div" tooltip={"Portfolio"}>
          <BottomNavButton onClick={handleHomeClick} current={location.pathname === "/portfolio"}>
            <NavIconHome />
          </BottomNavButton>
        </WithTooltip>
        <WithTooltip as="div" tooltip={"View NFTs"}>
          <BottomNavButton onClick={handleNftClick}>
            <NavIconNft />
          </BottomNavButton>
        </WithTooltip>
        {showTxHistory && (
          <WithTooltip as="div" tooltip={"Transaction History"}>
            <BottomNavButton onClick={handleTxHistoryClick}>
              <NavIconHistory />
            </BottomNavButton>
          </WithTooltip>
        )}
        <WithTooltip as="div" tooltip={"Expand Portfolio View"}>
          <BottomNavButton onClick={handleExpandClick}>
            <NavIconExpand />
          </BottomNavButton>
        </WithTooltip>
        <WithTooltip as="div" tooltip={"More Options"} noWrap>
          <BottomNavButton onClick={handleMoreClick}>
            {isNotConfirmed && <NavIconMoreAlert />}
            {!isNotConfirmed && <NavIconMore />}
          </BottomNavButton>
        </WithTooltip>
      </div>
    </>
  )
}
