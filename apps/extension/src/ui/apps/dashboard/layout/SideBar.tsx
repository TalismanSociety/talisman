import styled from "styled-components"
import Nav, { NavItem } from "@talisman/components/Nav"
import { ReactComponent as Logo } from "@talisman/theme/logos/talisman-full-color.svg"
import Build from "@ui/domains/Build"
import { ReactComponent as IconUser } from "@talisman/theme/icons/user.svg"
import { ReactComponent as IconPlus } from "@talisman/theme/icons/plus.svg"
import { ReactComponent as IconSettings } from "@talisman/theme/icons/settings.svg"
import { lazy, Suspense, useCallback } from "react"
import { BackupBanner } from "./BackupBanner"
import { DashboardAccountSelect } from "./DashboardAccountSelect"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { PaperPlaneIcon } from "@talisman/theme/icons"
import { useSendTokensModal } from "@ui/domains/Asset/Send"
import { useDashboard } from "../context"

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
      <Logo className="logo" />
      <Build.Version />
    </div>
  )
})`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 0.6rem;

  .logo {
    width: auto;
    height: 3.2rem;
  }
`

const Container = styled.aside`
  width: 32rem;
  min-width: 32rem;
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
`

export const SideBar = () => {
  const { account } = useDashboard()
  const { open } = useSendTokensModal()

  const handleSendFunds = useCallback(() => {
    open({ from: account?.address })
  }, [account?.address, open])

  return (
    <Container>
      <PaddedItem>
        <DashboardAccountSelect />
      </PaddedItem>
      <ScrollContainer className="scrollable">
        <Nav column>
          <NavItem to="/accounts" icon={<IconUser />} end>
            Portfolio
          </NavItem>
          <NavItem to="/accounts/add" icon={<IconPlus />}>
            Add Account
          </NavItem>
          <NavItem icon={<PaperPlaneIcon />} onClick={handleSendFunds}>
            Send Funds
          </NavItem>
          <NavItem external to="https://app.talisman.xyz/nfts" icon={<PaperPlaneIcon />}>
            NFTs
          </NavItem>
          <NavItem external to="https://app.talisman.xyz/crowdloans" icon={<PaperPlaneIcon />}>
            Crowdloans
          </NavItem>
          <NavItem to="/settings" icon={<IconSettings />}>
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
      <PaddedItem>
        <BrandLogo />
      </PaddedItem>
    </Container>
  )
}
