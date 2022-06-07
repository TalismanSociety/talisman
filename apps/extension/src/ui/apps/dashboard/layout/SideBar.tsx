import styled from "styled-components"
import Nav, { NavItem } from "@talisman/components/Nav"
import { ReactComponent as Logo } from "@talisman/theme/logos/talisman-full-color.svg"
import Build from "@ui/domains/Build"
import { ReactComponent as IconUser } from "@talisman/theme/icons/user.svg"
import { ReactComponent as IconPlus } from "@talisman/theme/icons/plus.svg"
import { ReactComponent as IconSettings } from "@talisman/theme/icons/settings.svg"
import { lazy, Suspense } from "react"
import { BackupBanner } from "./BackupBanner"

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
  min-width: 32rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  background: var(--color-background-muted);
  padding: 2.4rem;

  nav {
    width: 100%;
    flex-grow: 1;

    .link {
      border-radius: var(--border-radius);
      transition: all var(--transition-speed) ease-in-out;
      background: rgb(var(--color-foreground-raw), 0);
      width: 100%;
      margin-bottom: 0.5vw;
      padding-left: 0;
      padding-right: 0;

      &:hover {
        background: rgb(var(--color-foreground-raw), 0.05);
      }
    }
  }
`

export const SideBar = () => {
  return (
    <Container>
      <Nav column>
        <NavItem to="/accounts" icon={<IconUser />} end>
          Accounts
        </NavItem>
        <NavItem to="/accounts/add" icon={<IconPlus />}>
          Add Account
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
      <BrandLogo />
    </Container>
  )
}
