import { Drawer } from "@talisman/components/Drawer"
import { IconButton } from "@talisman/components/IconButton"
import Nav, { NavItem } from "@talisman/components/Nav"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import {
  LayoutIcon,
  LockIcon,
  MaximizeIcon,
  PaperPlaneIcon,
  PlusIcon,
  SettingsIcon,
  XIcon,
} from "@talisman/theme/icons"
import { FullColorSmallLogo } from "@talisman/theme/logos"
import { api } from "@ui/api"
import { useNavigationContext } from "@ui/apps/popup/context/NavigationContext"
import Build from "@ui/domains/Build"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { FC, useCallback } from "react"
import styled from "styled-components"

const Container = styled.aside`
  width: 100%;
  height: 100%;
  background: var(--color-background);
  display: flex;
  flex-direction: column;

  header {
    display: flex;
    justify-content: space-between;
    width: 100%;
    height: 7.2rem;
    align-items: center;
    padding: 0 2.4rem;
    box-sizing: border-box;
    border-bottom: 1px solid var(--color-background-muted-3x);
  }

  main {
    padding: 0.8rem 1rem;
    flex-grow: 1;

    .nav {
      display: flex;
      flex-direction: column;

      .link {
        height: 5.6rem;
        width: 100%;
      }
    }
  }

  footer {
    text-align: center;
    padding: 2rem;
  }

  .logo {
    width: auto;
    height: 2.5rem;
  }
`

export const NavigationDrawer: FC = () => {
  const { isOpen, close } = useNavigationContext()
  const { genericEvent } = useAnalytics()

  const handleLock = useCallback(async () => {
    await api.lock()
    close()
  }, [close])

  return (
    <Drawer anchor="right" open={isOpen} onClose={close} fullScreen>
      <Container>
        <header>
          <FullColorSmallLogo className="logo" />
          <IconButton onClick={close} aria-label="close menu">
            <XIcon />
          </IconButton>
        </header>
        <main>
          <ScrollContainer>
            <Nav column>
              <NavItem icon={<PlusIcon />} onClick={() => api.dashboardOpen("/accounts/add")}>
                Add Account
              </NavItem>
              <NavItem icon={<PaperPlaneIcon />} onClick={() => api.modalOpen("send")}>
                Send Funds
              </NavItem>
              <NavItem icon={<MaximizeIcon />} onClick={() => api.dashboardOpen("/accounts")}>
                Expand View
              </NavItem>
              <NavItem icon={<SettingsIcon />} onClick={() => api.dashboardOpen("/settings")}>
                Settings
              </NavItem>
              <NavItem
                icon={<LayoutIcon />}
                onClick={() => {
                  genericEvent("open webapp")
                  return window.open("https://app.talisman.xyz")
                }}
              >
                Talisman Web App
              </NavItem>
              <NavItem icon={<LockIcon />} onClick={handleLock}>
                Lock
              </NavItem>
            </Nav>
          </ScrollContainer>
        </main>
        <footer>
          <Build.Version />
        </footer>
      </Container>
    </Drawer>
  )
}
