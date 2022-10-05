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
import { useNavigationContext } from "@ui/apps/popup/context/NavigationContext"
import Build from "@ui/domains/Build"
import { useAnalytics } from "@ui/hooks/useAnalytics"
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
    window.close()
  }, [genericEvent])

  const handleSendFundsClick = useCallback(async () => {
    genericEvent("open send funds", { from: "popup nav" })
    await api.modalOpen("send")
    window.close()
  }, [genericEvent])

  const handleBuyTokensClick = useCallback(async () => {
    genericEvent("open buy tokens", { from: "popup nav" })
    await api.modalOpen("buy")
    window.close()
  }, [genericEvent])

  const handleSettingsClick = useCallback(() => {
    genericEvent("goto settings", { from: "popup nav" })
    api.dashboardOpen("/settings")
  }, [genericEvent])

  const handleBackupClick = useCallback(() => {
    genericEvent("goto backup", { from: "popup nav" })
    api.dashboardOpen("/settings?showBackupModal")
  }, [genericEvent])

  const { hideBalances, update } = useSettings()
  const toggleHideBalance = useCallback(() => {
    genericEvent("toggle hide balance", { from: "popup nav" })
    update({ hideBalances: !hideBalances })
    close()
  }, [close, genericEvent, hideBalances, update])

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
