import { Drawer } from "@talisman/components/Drawer"
import { IconButton } from "@talisman/components/IconButton"
import Nav, { NavItemButton } from "@talisman/components/Nav"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import {
  CreditCardIcon,
  ExternalLinkIcon,
  ImageIcon,
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
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
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

  ${NavItemButton} {
    transition: none;
    :hover {
      background: var(--color-background-muted);
    }
  }
`

export const ExtLinkIcon = styled(ExternalLinkIcon)`
  // margin: 0.2rem 0 0 0.4rem;
  vertical-align: text-top;
  display: inline;
`

export const NavigationDrawer: FC = () => {
  const { isOpen, close } = useNavigationContext()
  const { genericEvent } = useAnalytics()
  const showBuyTokens = useIsFeatureEnabled("BUY_CRYPTO")

  const handleLock = useCallback(async () => {
    genericEvent("lock", { from: "popup nav" })
    await api.lock()
    close()
  }, [close, genericEvent])

  const handleAddAccountClick = useCallback(() => {
    genericEvent("goto add account", { from: "popup nav" })
    api.dashboardOpen("/accounts/add")
  }, [genericEvent])

  const handleSendFundsClick = useCallback(() => {
    genericEvent("open send funds", { from: "popup nav" })
    api.modalOpen("send")
  }, [genericEvent])

  const handleBuyTokensClick = useCallback(() => {
    genericEvent("open buy tokens", { from: "popup nav" })
    api.modalOpen("buy")
  }, [genericEvent])

  const handlePortfolioClick = useCallback(() => {
    genericEvent("goto portfolio", { from: "popup nav" })
    api.dashboardOpen("/accounts")
  }, [genericEvent])

  const handleSettingsClick = useCallback(() => {
    genericEvent("goto settings", { from: "popup nav" })
    api.dashboardOpen("/settings")
  }, [genericEvent])

  const handleNFTClick = useCallback(() => {
    genericEvent("open web app nfts", { from: "popup nav" })
    window.open("https://app.talisman.xyz/nfts")
  }, [genericEvent])

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
              <NavItemButton icon={<PlusIcon />} onClick={handleAddAccountClick}>
                Add Account
              </NavItemButton>
              <NavItemButton icon={<PaperPlaneIcon />} onClick={handleSendFundsClick}>
                Send Funds
              </NavItemButton>
              <NavItemButton icon={<ImageIcon />} onClick={handleNFTClick}>
                NFTs <ExtLinkIcon />
              </NavItemButton>
              {showBuyTokens && (
                <NavItemButton icon={<CreditCardIcon />} onClick={handleBuyTokensClick}>
                  Buy Crypto
                </NavItemButton>
              )}
              <NavItemButton icon={<MaximizeIcon />} onClick={handlePortfolioClick}>
                Expand View
              </NavItemButton>
              <NavItemButton icon={<SettingsIcon />} onClick={handleSettingsClick}>
                Settings
              </NavItemButton>

              <NavItemButton icon={<LockIcon />} onClick={handleLock}>
                Lock
              </NavItemButton>
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
