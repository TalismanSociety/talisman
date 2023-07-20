import { TALISMAN_WEB_APP_NFTS_URL } from "@core/constants"
import { Nav, NavItem, NavItemProps } from "@talisman/components/Nav"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import {
  ArrowDownIcon,
  ClockIcon,
  CreditCardIcon,
  DownloadAlertIcon,
  ExternalLinkIcon,
  ImageIcon,
  MoreHorizontalIcon,
  PaperPlaneIcon,
  PlusIcon,
  SettingsIcon,
  StarIcon,
  UserIcon,
  ZapIcon,
} from "@talisman/theme/icons"
import { FullColorLogo, FullColorVerticalLogo, HandRedLogo } from "@talisman/theme/logos"
import { classNames } from "@talismn/util"
import { AccountContextMenu } from "@ui/apps/dashboard/routes/Portfolio/AccountContextMenu"
import { useBuyTokensModal } from "@ui/domains/Asset/Buy/BuyTokensModalContext"
import { BuildVersionPill } from "@ui/domains/Build/BuildVersionPill"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { AccountSelect } from "@ui/domains/Portfolio/AccountSelect"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { getTransactionHistoryUrl } from "@ui/util/getTransactionHistoryUrl"
import { ButtonHTMLAttributes, FC, ReactNode, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"
import { PillButton, PillButtonProps, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

// show tooltip only on small screens
const ResponsiveTooltip = ({
  tooltip,
  className,
  children,
}: {
  className?: string
  tooltip?: ReactNode
  children?: ReactNode
}) => (
  <Tooltip placement="right">
    <TooltipTrigger asChild>
      <div className={classNames("w-full", className)}>{children}</div>
    </TooltipTrigger>
    <TooltipContent className="rounded-xs text-body-secondary border-grey-700 z-20 border-[0.5px] bg-black p-3 text-xs shadow md:hidden">
      {tooltip}
    </TooltipContent>
  </Tooltip>
)

const SideBarNavItem: FC<
  Omit<NavItemProps & { title: ReactNode; isExternalLink?: boolean }, "children">
> = ({ title, isExternalLink, className, ...props }) => {
  return (
    <ResponsiveTooltip tooltip={title} className={className}>
      <NavItem {...props} className="flex-col lg:flex-row" contentClassName="hidden md:block">
        {isExternalLink ? (
          <>
            <span>{title}</span> <ExternalLinkIcon className="hidden lg:inline" />
          </>
        ) : (
          <>{title}</>
        )}
      </NavItem>
    </ResponsiveTooltip>
  )
}

const SendPillButton: FC<PillButtonProps> = (props) => {
  const { account } = useSelectedAccount()
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(account)

  return canSendFunds ? (
    <PillButton onClick={openSendFundsPopup} {...props} />
  ) : (
    <Tooltip placement="bottom-start">
      <TooltipTrigger asChild>
        <PillButton disabled {...props} />
      </TooltipTrigger>
      <TooltipContent>{cannotSendFundsReason}</TooltipContent>
    </Tooltip>
  )
}

const SendIconButton: FC<Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref">> = (props) => {
  const { account } = useSelectedAccount()
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(account)

  return canSendFunds ? (
    <IconButton onClick={openSendFundsPopup} {...props} />
  ) : (
    <Tooltip placement="bottom-start">
      <TooltipTrigger asChild>
        <IconButton disabled {...props} />
      </TooltipTrigger>
      <TooltipContent>{cannotSendFundsReason}</TooltipContent>
    </Tooltip>
  )
}

export const SideBar = () => {
  const { account } = useSelectedAccount()
  const navigate = useNavigate()
  const { genericEvent } = useAnalytics()
  const showBuyCryptoButton = useIsFeatureEnabled("BUY_CRYPTO")
  const showStaking = useIsFeatureEnabled("LINK_STAKING")

  const { open: openCopyAddressModal } = useCopyAddressModal()

  const { isSnoozed } = useMnemonicBackup()
  const handleCopyClick = useCallback(() => {
    openCopyAddressModal({
      mode: "receive",
      address: account?.address,
    })
    genericEvent("open receive", { from: "sidebar" })
  }, [account, genericEvent, openCopyAddressModal])

  const handlePortfolioClick = useCallback(() => {
    genericEvent("goto portfolio", { from: "sidebar" })
    navigate("/portfolio")
  }, [genericEvent, navigate])

  const handleAddAccountClick = useCallback(() => {
    genericEvent("goto add account", { from: "sidebar" })
    navigate("/accounts/add")
  }, [genericEvent, navigate])

  const handleNftsClick = useCallback(() => {
    genericEvent("open web app nfts", { from: "sidebar", target: "nfts" })
    window.open(TALISMAN_WEB_APP_NFTS_URL, "_blank")
    return false
  }, [genericEvent])

  const handleStakingClick = useCallback(() => {
    genericEvent("open web app staking", { from: "sidebar", target: "staking" })
    window.open("https://app.talisman.xyz/staking", "_blank")
    return false
  }, [genericEvent])

  const showTxHistory = useIsFeatureEnabled("LINK_TX_HISTORY")
  const handleTxHistoryClick = useCallback(() => {
    genericEvent("open web app tx history", { from: "sidebar" })
    window.open(getTransactionHistoryUrl(account?.address), "_blank")
    return false
  }, [account?.address, genericEvent])

  const handleCrowdloansClick = useCallback(() => {
    genericEvent("open web app crowdloans", { from: "sidebar", target: "crowdloans" })
    window.open("https://app.talisman.xyz/crowdloans", "_blank")
  }, [genericEvent])

  const handleSettingsClick = useCallback(() => {
    genericEvent("goto settings", { from: "sidebar" })
    navigate("/settings")
  }, [genericEvent, navigate])

  const { open: openBuyModal } = useBuyTokensModal()
  const handleBuyClick = useCallback(() => {
    genericEvent("open buy tokens", { from: "sidebar" })
    openBuyModal()
  }, [genericEvent, openBuyModal])

  const handleBackupClick = useCallback(() => {
    genericEvent("goto backup modal", { from: "sidebar" })
    navigate("/settings?showBackupModal")
  }, [genericEvent, navigate])

  const { t } = useTranslation()

  return (
    <div className="bg-grey-850 flex w-[7.4rem] shrink-0 flex-col overflow-hidden md:w-[17.2rem] lg:w-[32rem]">
      <div className="p-4 md:p-12">
        <AccountSelect />
        {/* Pills for large screens */}
        <div className="hidden flex-col items-center gap-4 p-4 pb-0 md:flex lg:flex-row">
          <SendPillButton className="!px-4" icon={PaperPlaneIcon}>
            {t("Send")}
          </SendPillButton>
          <PillButton className="!px-4" icon={ArrowDownIcon} onClick={handleCopyClick}>
            {t("Receive")}
          </PillButton>
          <div className="hidden flex-grow lg:block" />
          <AccountContextMenu
            analyticsFrom="dashboard portfolio"
            placement="bottom-start"
            trigger={
              <PillButton className="!px-4">
                <MoreHorizontalIcon className="shrink-0" />
              </PillButton>
            }
          />
        </div>
        {/* Buttons for small screens */}
        <div className="flex justify-center py-2 md:hidden">
          <SendIconButton className="hover:bg-grey-800 rounded-xs p-1 !text-base">
            <PaperPlaneIcon />
          </SendIconButton>
          <IconButton
            className="hover:bg-grey-800 rounded-xs p-1 !text-base"
            onClick={handleCopyClick}
          >
            <ArrowDownIcon />
          </IconButton>
          <AccountContextMenu
            analyticsFrom="dashboard portfolio"
            trigger={
              <IconButton className="hover:bg-grey-800 rounded-xs p-1 !text-base">
                <MoreHorizontalIcon />
              </IconButton>
            }
          />
        </div>
      </div>
      <ScrollContainer className="flex-grow">
        <Nav className="gap-2 p-4 text-sm lg:p-12 lg:text-base">
          <SideBarNavItem
            title={t("Portfolio")}
            to="/portfolio"
            onClick={handlePortfolioClick}
            icon={<UserIcon />}
          />
          {showBuyCryptoButton && (
            <SideBarNavItem
              title={t("Buy Crypto")}
              onClick={handleBuyClick}
              icon={<CreditCardIcon />}
            />
          )}
          <SideBarNavItem
            title={t("Add Account")}
            to="/accounts/add"
            onClick={handleAddAccountClick}
            icon={<PlusIcon />}
          />

          {showStaking && (
            <SideBarNavItem
              title={t("Staking")}
              onClick={handleStakingClick}
              isExternalLink
              icon={<ZapIcon />}
            />
          )}
          <SideBarNavItem
            title={t("NFTs")}
            onClick={handleNftsClick}
            icon={<ImageIcon />}
            isExternalLink
          />
          <SideBarNavItem
            title={t("Crowdloans")}
            onClick={handleCrowdloansClick}
            icon={<StarIcon />}
            isExternalLink
          />
          {showTxHistory && (
            <SideBarNavItem
              title={t("Transaction History")}
              onClick={handleTxHistoryClick}
              icon={<ClockIcon />}
              isExternalLink
            />
          )}
          <SideBarNavItem
            title={t("Settings")}
            to="/settings"
            onClick={handleSettingsClick}
            icon={<SettingsIcon />}
          />
          {isSnoozed && (
            <SideBarNavItem
              title={t("Backup Wallet")}
              // show only on large screens
              className="!hidden lg:!flex"
              onClick={handleBackupClick}
              icon={<DownloadAlertIcon />}
            />
          )}
        </Nav>
      </ScrollContainer>
      <footer className="flex w-full items-center justify-center p-8 md:p-12 lg:justify-between">
        <a href="https://talisman.xyz" target="_blank">
          <FullColorLogo className="hidden h-16 w-auto lg:block" />
          <FullColorVerticalLogo className="hidden h-[7rem] w-auto md:block lg:hidden" />
          <HandRedLogo className="h-auto w-full md:hidden" />
        </a>
        <div className="hidden lg:block">
          <BuildVersionPill />
        </div>
      </footer>
    </div>
  )
}
