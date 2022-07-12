import { IconButton } from "@talisman/components/IconButton"
import Nav, { NavItem } from "@talisman/components/Nav"
import { PillButton } from "@talisman/components/PillButton"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { WithTooltip } from "@talisman/components/Tooltip"
import { breakpoints } from "@talisman/theme/definitions"
import {
  CopyIcon,
  ImageIcon,
  PaperPlaneIcon,
  PlusIcon,
  SettingsIcon,
  StarIcon,
  UserIcon,
} from "@talisman/theme/icons"
import { FullColorLogo, FullColorVerticalLogo, HandRedLogo } from "@talisman/theme/logos"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import { useSendTokensModal } from "@ui/domains/Asset/Send"
import Build from "@ui/domains/Build"
import { AccountSelect } from "@ui/domains/Portfolio/AccountSelect"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { ReactNode, useCallback } from "react"
import { useWindowSize } from "react-use"
import styled from "styled-components"

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
  padding-top: 0;
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
      transition: all var(--transition-speed) ease-in-out;
      background: rgb(var(--color-foreground-raw), 0);
      width: 100%;
      padding-left: 0.8;
      padding-right: 0;

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

    nav .link span:last-child {
      display: none;
    }
    nav .link {
      justify-content: center;
      padding-left: 0;
      padding-right: 0;
      font-size: var(--font-size-normal);
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

export const SideBar = () => {
  const { account } = useSelectedAccount()
  const { open: openSendTokens } = useSendTokensModal()
  const { open: openCopyAddressModal } = useAddressFormatterModal()

  const handleSendClick = useCallback(() => {
    openSendTokens({ from: account?.address })
  }, [account?.address, openSendTokens])

  const handleCopyClick = useCallback(() => {
    if (!account) return
    openCopyAddressModal(account.address)
  }, [account, openCopyAddressModal])

  return (
    <Container>
      <PaddedItem>
        <AccountSelect responsive />
        {/* Pills for large screens */}
        <Pills>
          <PillButton onClick={handleSendClick}>
            Send <PaperPlaneIcon />
          </PillButton>
          {account && (
            <PillButton onClick={handleCopyClick}>
              Copy <CopyIcon />
            </PillButton>
          )}
        </Pills>
        {/* Buttons for small screens */}
        <Buttons>
          <IconButton onClick={handleSendClick}>
            <PaperPlaneIcon />
          </IconButton>
          {account && (
            <IconButton onClick={handleCopyClick}>
              <CopyIcon />
            </IconButton>
          )}
        </Buttons>
      </PaddedItem>
      <ScrollContainer className="scrollable">
        <Nav column>
          <NavItem
            to="/portfolio"
            icon={
              <ResponsiveTooltip tooltip="Portfolio">
                <UserIcon />
              </ResponsiveTooltip>
            }
          >
            Portfolio
          </NavItem>
          <NavItem
            to="/accounts/add"
            icon={
              <ResponsiveTooltip tooltip="Add Account">
                <PlusIcon />
              </ResponsiveTooltip>
            }
          >
            Add Account
          </NavItem>
          <NavItem
            external
            to="https://app.talisman.xyz/nfts"
            icon={
              <ResponsiveTooltip tooltip="NFTs">
                <ImageIcon />
              </ResponsiveTooltip>
            }
          >
            NFTs
          </NavItem>
          <NavItem
            external
            to="https://app.talisman.xyz/crowdloans"
            icon={
              <ResponsiveTooltip tooltip="Crowdloans">
                <StarIcon />
              </ResponsiveTooltip>
            }
          >
            Crowdloans
          </NavItem>
          <NavItem
            to="/settings"
            icon={
              <ResponsiveTooltip tooltip="Settings">
                <SettingsIcon />
              </ResponsiveTooltip>
            }
          >
            Settings
          </NavItem>
        </Nav>
      </ScrollContainer>
      <PaddedItem className="logo-container">
        <BrandLogo />
      </PaddedItem>
    </Container>
  )
}
