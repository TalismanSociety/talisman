import { IconButton } from "@talisman/components/IconButton"
import Nav, { NavItemButton, NavItemLink } from "@talisman/components/Nav"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { WithTooltip } from "@talisman/components/Tooltip"
import { breakpoints } from "@talisman/theme/definitions"
import {
  ArrowDownIcon,
  ClockIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  ImageIcon,
  PaperPlaneIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
  ZapIcon,
} from "@talisman/theme/icons"
import { FullColorLogo, FullColorVerticalLogo, HandRedLogo } from "@talisman/theme/logos"
import { api } from "@ui/api"
import { useBuyTokensModal } from "@ui/domains/Asset/Buy/BuyTokensModalContext"
import Build from "@ui/domains/Build"
import { useCopyAddressModal } from "@ui/domains/CopyAddress/useCopyAddressModal"
import { AccountSelect } from "@ui/domains/Portfolio/AccountSelect"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { getTransactionHistoryUrl } from "@ui/util/getTransactionHistoryUrl"
import { ReactNode, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useWindowSize } from "react-use"
import styled from "styled-components"
import { PillButton } from "talisman-ui"

const PaddedItem = styled.div`
  padding: 2.4rem;
  position: relative;
  width: 100%;
`

const BrandLogo = styled(({ className }) => {
  return (
    <div className={className}>
      <a href="https://talisman.xyz" target="_blank">
        <FullColorLogo className="logo-full" />
        <FullColorVerticalLogo className="logo-medium" />
        <HandRedLogo className="logo-small" />
      </a>
      <Build.Version />
    </div>
  )
})`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 0.6rem;

  .logo-full {
    width: auto;
    height: 3.2rem;
  }

  .logo-medium,
  .logo-small {
    display: none;
  }

  @media (max-width: ${breakpoints.large}px) {
    justify-content: center;
    padding-left: 0;

    .logo-full {
      display: none;
    }
    .logo-medium {
      display: inline-block;
      height: 7rem;
      width: auto;
    }
  }

  @media (max-width: ${breakpoints.medium}px) {
    .logo-medium {
      display: none;
    }
    .logo-small {
      display: inline-block;
      width: 100%;
      height: auto;
    }
  }
`

const Pills = styled.div`
  display: flex;
  gap: 0.8rem;
  padding: 0.8rem;
  padding-bottom: 0;
  @media (max-width: ${breakpoints.large}px) {
    flex-direction: column;
    align-items: center;
  }
  @media (max-width: ${breakpoints.medium}px) {
    display: none;
  }
`

const Buttons = styled.div`
  display: none;
  gap: 0.8rem;
  padding: 0.8rem;
  justify-content: center;

  @media (max-width: ${breakpoints.medium}px) {
    display: flex;
  }

  .icon-button,
  .icon-button svg {
    width: 1.6rem;
    height: 1.6rem;
  }
`

const Container = styled.aside`
  width: 32rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  background: var(--color-background-muted);
  flex-shrink: 0;

  .scrollable {
    flex-grow: 1;
    width: 100%;
  }

  nav {
    width: 100%;
    flex-grow: 1;
    padding: 2.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;

    .link {
      border-radius: var(--border-radius);
      background: rgb(var(--color-foreground-raw), 0);
      width: 100%;
      padding-left: 0.8;
      padding-right: 0;

      span:not(.icon) {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      &:hover {
        background: rgb(var(--color-foreground-raw), 0.05);
      }
    }
  }

  // medium sidebar
  @media (max-width: ${breakpoints.large}px) {
    width: 17.2rem;
    min-width: 17.2rem;

    nav .link {
      flex-direction: column;
      gap: 0.6rem;
      font-size: var(--font-size-xsmall);
    }

    // hide version pill in footer
    .pill {
      display: none;
    }
  }

  // small sidebar
  @media (max-width: ${breakpoints.medium}px) {
    width: 7.4rem;
    min-width: 7.4rem;

    ${PaddedItem} {
      padding: 0.8rem;
    }
    nav {
      padding: 2.4rem 0.8rem;
    }

    .logo-container {
      padding: 1.6rem;
    }

    nav .link span:last-child,
    nav .link {
      justify-content: center;
      padding-left: 0;
      padding-right: 0;
      font-size: var(--font-size-normal);

      > span:not(.icon) {
        display: none;
      }
    }

    ${Pills} {
      display: none;
    }
  }
`

const ResponsiveTooltip = ({
  tooltip,
  children,
}: {
  tooltip?: ReactNode
  children?: ReactNode
}) => {
  // show tooltip only on small screens
  const { width } = useWindowSize()

  return width <= breakpoints.medium ? (
    <WithTooltip tooltip={tooltip}>{children}</WithTooltip>
  ) : (
    <>{children}</>
  )
}

const ExtLinkIcon = styled(({ className }: { className?: string }) => (
  <span className={className}>
    <ExternalLinkIcon />
  </span>
))`
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  vertical-align: text-top;
`

export const SideBar = () => {
  const { account } = useSelectedAccount()
  const navigate = useNavigate()
  const { genericEvent } = useAnalytics()
  const showBuyCryptoButton = useIsFeatureEnabled("BUY_CRYPTO")
  const showStaking = useIsFeatureEnabled("LINK_STAKING")

  const handleSendClick = useCallback(() => {
    api.sendFundsOpen({
      from: account?.address,
    })
    genericEvent("open send funds", { from: "sidebar" })
  }, [account?.address, genericEvent])

  const { open: openCopyAddressModal } = useCopyAddressModal()
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
    window.open("https://app.talisman.xyz/portfolio/nfts", "_blank")
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

  // const handleCrowdloansClick = useCallback(() => {
  //   genericEvent("open web app crowdloans", { from: "sidebar", target: "crowdloans" })
  //   window.open("https://app.talisman.xyz/crowdloans", "_blank")
  // }, [genericEvent])

  const handleSettingsClick = useCallback(() => {
    genericEvent("goto settings", { from: "sidebar" })
    navigate("/settings")
  }, [genericEvent, navigate])

  const { open: openBuyModal } = useBuyTokensModal()
  const handleBuyClick = useCallback(() => {
    genericEvent("open buy tokens", { from: "sidebar" })
    openBuyModal()
  }, [genericEvent, openBuyModal])

  return (
    <Container>
      <PaddedItem>
        <AccountSelect responsive />
        {/* Pills for large screens */}
        <Pills>
          <PillButton className="!px-4" icon={PaperPlaneIcon} onClick={handleSendClick}>
            Send
          </PillButton>
          <PillButton className="!px-4" icon={ArrowDownIcon} onClick={handleCopyClick}>
            Receive
          </PillButton>
        </Pills>
        {/* Buttons for small screens */}
        <Buttons>
          <IconButton onClick={handleSendClick}>
            <PaperPlaneIcon />
          </IconButton>
          <IconButton onClick={handleCopyClick}>
            <ArrowDownIcon />
          </IconButton>
        </Buttons>
      </PaddedItem>
      <ScrollContainer className="scrollable">
        <Nav column>
          <NavItemLink
            to="/portfolio"
            onClick={handlePortfolioClick}
            icon={
              <ResponsiveTooltip tooltip="Portfolio">
                <UserIcon />
              </ResponsiveTooltip>
            }
          >
            Portfolio
          </NavItemLink>
          {showBuyCryptoButton && (
            <NavItemButton
              onClick={handleBuyClick}
              icon={
                <ResponsiveTooltip tooltip="Buy Crypto">
                  <CreditCardIcon />
                </ResponsiveTooltip>
              }
            >
              Buy Crypto
            </NavItemButton>
          )}
          <NavItemLink
            to="/accounts/add"
            onClick={handleAddAccountClick}
            icon={
              <ResponsiveTooltip tooltip="Add Account">
                <PlusIcon />
              </ResponsiveTooltip>
            }
          >
            Add Account
          </NavItemLink>
          {showStaking && (
            <NavItemButton
              onClick={handleStakingClick}
              icon={
                <ResponsiveTooltip tooltip="Staking">
                  <ZapIcon />
                </ResponsiveTooltip>
              }
            >
              Staking <ExtLinkIcon />
            </NavItemButton>
          )}
          <NavItemButton
            onClick={handleNftsClick}
            icon={
              <ResponsiveTooltip tooltip="NFTs">
                <ImageIcon />
              </ResponsiveTooltip>
            }
          >
            NFTs <ExtLinkIcon />
          </NavItemButton>
          {/* <NavItemButton
            onClick={handleCrowdloansClick}
            icon={
              <ResponsiveTooltip tooltip="Crowdloans">
                <StarIcon />
              </ResponsiveTooltip>
            }
          >
            Crowdloans <ExtLinkIcon />
          </NavItemButton> */}
          {showTxHistory && (
            <NavItemButton
              onClick={handleTxHistoryClick}
              icon={
                <ResponsiveTooltip tooltip="Transaction History">
                  <ClockIcon />
                </ResponsiveTooltip>
              }
            >
              Transaction History <ExtLinkIcon />
            </NavItemButton>
          )}
          <NavItemLink
            to="/settings"
            onClick={handleSettingsClick}
            icon={
              <ResponsiveTooltip tooltip="Settings">
                <SettingsIcon />
              </ResponsiveTooltip>
            }
          >
            Settings
          </NavItemLink>
        </Nav>
      </ScrollContainer>
      <PaddedItem className="logo-container">
        <BrandLogo />
      </PaddedItem>
    </Container>
  )
}
