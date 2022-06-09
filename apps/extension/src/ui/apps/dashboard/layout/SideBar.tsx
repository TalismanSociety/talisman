import styled from "styled-components"
import Nav, { NavItem } from "@talisman/components/Nav"
import Build from "@ui/domains/Build"
import { lazy, Suspense, useCallback } from "react"
import { BackupBanner } from "./BackupBanner"
import { DashboardAccountSelect } from "./DashboardAccountSelect"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import {
  CopyIcon,
  ImageIcon,
  PaperPlaneIcon,
  PlusIcon,
  SettingsIcon,
  StarIcon,
  UserIcon,
} from "@talisman/theme/icons"
import { useSendTokensModal } from "@ui/domains/Asset/Send"
import { useSelectedAccount } from "../context"
import { PillButton } from "@talisman/components/PillButton"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import { FullColorLogo, FullColorVerticalLogo } from "@talisman/theme/logos"
import { IconButton } from "@talisman/components/IconButton"

const PaddedItem = styled.div`
  padding: 2.4rem;
  position: relative;
  width: 100%;
`

const BraveWarningBanner = lazy(
  () => import("@ui/domains/Settings/BraveWarning/BraveWarningBanner")
)

const BrandLogo = styled(({ className }) => {
  return (
    <div className={className}>
      <a href="https://talisman.xyz" target="_blank">
        <FullColorLogo className="logo-full" />
        <FullColorVerticalLogo className="logo-vertical" />
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
  .logo-vertical {
    display: none;
  }

  @media (max-width: 960px) {
    .logo-full {
      display: none;
    }
    .logo-vertical {
      display: inline-block;
      width: 6.4rem;
      height: auto;
    }
  }
`

const Pills = styled.div`
  display: flex;
  gap: 0.8rem;
  padding: 0.8rem;
  padding-bottom: 0;
  @media (max-width: 960px) {
    display: none;
  }
`

const Buttons = styled.div`
  display: none;
  gap: 0.8rem;
  padding: 0.8rem;
  padding-top: 0;
  justify-content: space-between;

  @media (max-width: 960px) {
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

  @media (max-width: 960px) {
    width: 7.4rem;
    min-width: 7.4rem;

    ${PaddedItem}, nav {
      padding: 0.8rem;
    }
    .logo-container {
      padding: 0.8rem 0;
    }

    nav .link span:last-child {
      display: none;
    }
    nav .link {
      justify-content: center;
      padding-left: 0;
      padding-right: 0;
    }

    ${Pills}, .pill {
      display: none;
    }
  }
`

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
        <DashboardAccountSelect />
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
          <NavItem to="/portfolio" icon={<UserIcon />} end>
            Portfolio
          </NavItem>
          <NavItem to="/accounts/add" icon={<PlusIcon />}>
            Add Account
          </NavItem>

          <NavItem external to="https://app.talisman.xyz/nfts" icon={<ImageIcon />}>
            NFTs
          </NavItem>
          <NavItem external to="https://app.talisman.xyz/crowdloans" icon={<StarIcon />}>
            Crowdloans
          </NavItem>
          <NavItem to="/settings" icon={<SettingsIcon />}>
            Settings
          </NavItem>
        </Nav>
        <div className="bottom">
          <Suspense fallback={null}>
            <BraveWarningBanner />
          </Suspense>
          <BackupBanner />
        </div>
      </ScrollContainer>
      <PaddedItem className="logo-container">
        <BrandLogo />
      </PaddedItem>
    </Container>
  )
}
