import { Drawer } from "@talisman/components/Drawer"
import { IconButton } from "@talisman/components/IconButton"
import Nav, { NavItemButton } from "@talisman/components/Nav"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import {
  CreditCardIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  KeyIcon,
  LockIcon,
  PaperPlaneIcon,
  PlusIcon,
  SettingsIcon,
  XIcon,
} from "@talisman/theme/icons"
import { FullColorSmallLogo } from "@talisman/theme/logos"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useNavigationContext } from "@ui/apps/popup/context/NavigationContext"
import Build from "@ui/domains/Build"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useSettings } from "@ui/hooks/useSettings"
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
  vertical-align: text-top;
  display: inline;
`

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Navigation",
  featureVersion: 3,
  page: "Portfolio",
}

export const NavigationDrawer: FC = () => {
  const { isOpen, close } = useNavigationContext()
  const showBuyTokens = useIsFeatureEnabled("BUY_CRYPTO")

  const handleLock = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Interact",
      action: "Lock wallet",
    })
    api.lock()
    window.close()
  }, [])

  const handleAddAccountClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add account button",
    })
    api.dashboardOpen("/accounts/add")
    window.close()
  }, [])

  const handleSendFundsClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Send Funds button",
    })
    await api.modalOpen({ modalType: "send" })
    window.close()
  }, [])

  const handleBuyTokensClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Buy Crypto button",
    })
    await api.modalOpen({ modalType: "buy" })
    window.close()
  }, [])

  const handleSettingsClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Settings button",
    })
    api.dashboardOpen("/settings")
    window.close()
  }, [])

  const handleBackupClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Backup wallet button",
    })
    api.dashboardOpen("/settings?showBackupModal")
    window.close()
  }, [])

  const { hideBalances, update } = useSettings()
  const toggleHideBalance = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Hide balances button",
    })
    update({ hideBalances: !hideBalances })
    close()
  }, [close, hideBalances, update])

  const { isNotConfirmed } = useMnemonicBackup()

  return (
    <Drawer anchor="bottom" open={isOpen} onClose={close} fullScreen>
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
              <NavItemButton icon={<PaperPlaneIcon />} onClick={handleSendFundsClick}>
                Send Funds
              </NavItemButton>
              {showBuyTokens && (
                <NavItemButton icon={<CreditCardIcon />} onClick={handleBuyTokensClick}>
                  Buy Crypto
                </NavItemButton>
              )}
              <NavItemButton
                icon={hideBalances ? <EyeIcon /> : <EyeOffIcon />}
                onClick={toggleHideBalance}
              >
                {hideBalances ? "Show" : "Hide"} Balances{" "}
              </NavItemButton>
              <NavItemButton icon={<PlusIcon />} onClick={handleAddAccountClick}>
                Add Account
              </NavItemButton>
              <NavItemButton icon={<SettingsIcon />} onClick={handleSettingsClick}>
                Settings
              </NavItemButton>
              <NavItemButton icon={<KeyIcon />} onClick={handleBackupClick}>
                <span className="inline-flex items-center gap-4">
                  <span>Backup Wallet</span>
                  {isNotConfirmed && <InfoIcon className="text-primary inline-block" />}
                </span>
              </NavItemButton>
              <NavItemButton icon={<LockIcon />} onClick={handleLock}>
                Lock Wallet
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
