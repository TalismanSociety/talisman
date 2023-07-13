import { TALISMAN_WEB_APP_NFTS_URL } from "@core/constants"
import { Nav, NavItem } from "@talisman/components/Nav"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import {
  ArrowDownIcon,
  ClockIcon,
  CreditCardIcon,
  DownloadAlertIcon,
  ExternalLinkIcon,
  ImageIcon,
  PaperPlaneIcon,
  PlusIcon,
  SettingsIcon,
  StarIcon,
  UserIcon,
  ZapIcon,
} from "@talisman/theme/icons"
import { FullColorLogo, FullColorVerticalLogo, HandRedLogo } from "@talisman/theme/logos"
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
  children,
}: {
  tooltip?: ReactNode
  children?: ReactNode
}) => (
  <Tooltip>
    <TooltipTrigger>{children}</TooltipTrigger>
    <TooltipContent className="md:hidden">{tooltip}</TooltipContent>
  </Tooltip>
)

const SendPillButton: FC<PillButtonProps> = (props) => {
  const { account } = useSelectedAccount()
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(account)

  return canSendFunds ? (
    <PillButton onClick={openSendFundsPopup} {...props} />
  ) : (
    <Tooltip placement="bottom-start">
      <TooltipTrigger>
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
      <TooltipTrigger>
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
        <AccountSelect responsive />
        {/* Pills for large screens */}
        <div className="hidden flex-col items-center gap-4 p-4 pb-0 md:flex lg:flex-row">
          <SendPillButton className="!px-4" icon={PaperPlaneIcon}>
            {t("Send")}
          </SendPillButton>
          <PillButton className="!px-4" icon={ArrowDownIcon} onClick={handleCopyClick}>
            {t("Receive")}
          </PillButton>
        </div>
        {/* Buttons for small screens */}
        <div className="flex justify-center gap-4 py-4 md:hidden">
          <SendIconButton>
            <PaperPlaneIcon />
          </SendIconButton>
          <IconButton onClick={handleCopyClick}>
            <ArrowDownIcon />
          </IconButton>
        </div>
      </div>
      <ScrollContainer className="flex-grow">
        <Nav className="gap-2 lg:p-12">
          <NavItem
            to="/portfolio"
            className="flex-col lg:flex-row"
            contentClassName="hidden md:block"
            onClick={handlePortfolioClick}
            icon={
              <ResponsiveTooltip tooltip="Portfolio">
                <UserIcon />
              </ResponsiveTooltip>
            }
          >
            {t("Portfolio")}
          </NavItem>
          {showBuyCryptoButton && (
            <NavItem
              className="flex-col lg:flex-row"
              contentClassName="hidden md:block"
              onClick={handleBuyClick}
              icon={
                <ResponsiveTooltip tooltip="Buy Crypto">
                  <CreditCardIcon />
                </ResponsiveTooltip>
              }
            >
              {t("Buy Crypto")}
            </NavItem>
          )}
          <NavItem
            to="/accounts/add"
            className="flex-col lg:flex-row"
            contentClassName="hidden md:block"
            onClick={handleAddAccountClick}
            icon={
              <ResponsiveTooltip tooltip="Add Account">
                <PlusIcon />
              </ResponsiveTooltip>
            }
          >
            {t("Add Account")}
          </NavItem>
          {showStaking && (
            <NavItem
              className="flex-col lg:flex-row"
              contentClassName="hidden md:block"
              onClick={handleStakingClick}
              icon={
                <ResponsiveTooltip tooltip="Staking">
                  <ZapIcon />
                </ResponsiveTooltip>
              }
            >
              <span>{t("Staking")}</span> <ExternalLinkIcon className="hidden lg:inline" />
            </NavItem>
          )}
          <NavItem
            className="flex-col lg:flex-row"
            contentClassName="hidden md:block"
            onClick={handleNftsClick}
            icon={
              <ResponsiveTooltip tooltip="NFTs">
                <ImageIcon />
              </ResponsiveTooltip>
            }
          >
            <span>{t("NFTs")}</span> <ExternalLinkIcon className="hidden lg:inline" />
          </NavItem>
          <NavItem
            className="flex-col lg:flex-row"
            contentClassName="hidden md:block"
            onClick={handleCrowdloansClick}
            icon={
              <ResponsiveTooltip tooltip="Crowdloans">
                <StarIcon />
              </ResponsiveTooltip>
            }
          >
            <span>{t("Crowdloans")}</span> <ExternalLinkIcon className="hidden lg:inline" />
          </NavItem>
          {showTxHistory && (
            <NavItem
              className="flex-col lg:flex-row"
              contentClassName="hidden md:block"
              onClick={handleTxHistoryClick}
              icon={
                <ResponsiveTooltip tooltip="Transaction History">
                  <ClockIcon />
                </ResponsiveTooltip>
              }
            >
              <span>{t("Transaction History")}</span>{" "}
              <ExternalLinkIcon className="hidden lg:inline" />
            </NavItem>
          )}
          <NavItem
            to="/settings"
            className="flex-col lg:flex-row"
            contentClassName="hidden md:block"
            onClick={handleSettingsClick}
            icon={
              <ResponsiveTooltip tooltip="Settings">
                <SettingsIcon />
              </ResponsiveTooltip>
            }
          >
            {t("Settings")}
          </NavItem>
          {isSnoozed && (
            <NavItem
              // show only on large screens
              className="!hidden lg:!flex"
              onClick={handleBackupClick}
              icon={<DownloadAlertIcon />}
            >
              {t("Backup Wallet")}
            </NavItem>
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
