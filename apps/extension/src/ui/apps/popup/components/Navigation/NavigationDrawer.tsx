import { Drawer } from "@talisman/components/Drawer"
import { IconButton } from "@talisman/components/IconButton"
import Nav, { NavItemButton } from "@talisman/components/Nav"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import {
  CreditCardIcon,
  DownloadAlertIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
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
import { BuildVersionPill } from "@ui/domains/Build/BuildVersionPill"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useSetting } from "@ui/hooks/useSettings"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
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
    await api.sendFundsOpen()
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

  const [hideBalances, setHideBalances] = useSetting("hideBalances")
  const toggleHideBalance = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Hide balances button",
    })
    setHideBalances((prev) => !prev)
    close()
  }, [close, setHideBalances])

  const { isNotConfirmed } = useMnemonicBackup()

  const { t } = useTranslation()

  return (
    <Drawer anchor="bottom" open={isOpen} onClose={close} fullScreen>
      <Container>
        <header>
          <FullColorSmallLogo className="logo" />
          <IconButton onClick={close} aria-label={t("Close menu")}>
            <XIcon />
          </IconButton>
        </header>
        <main>
          <ScrollContainer>
            <Nav column>
              <NavItemButton icon={<PaperPlaneIcon />} onClick={handleSendFundsClick}>
                {t("Send Funds")}
              </NavItemButton>
              {showBuyTokens && (
                <NavItemButton icon={<CreditCardIcon />} onClick={handleBuyTokensClick}>
                  {t("Buy Crypto")}
                </NavItemButton>
              )}
              <NavItemButton
                icon={hideBalances ? <EyeIcon /> : <EyeOffIcon />}
                onClick={toggleHideBalance}
              >
                {hideBalances ? t("Show Balances") : t("Hide Balances")}
              </NavItemButton>
              <NavItemButton icon={<PlusIcon />} onClick={handleAddAccountClick}>
                {t("Add Account")}
              </NavItemButton>
              <NavItemButton icon={<SettingsIcon />} onClick={handleSettingsClick}>
                {t("Settings")}
              </NavItemButton>
              <NavItemButton
                icon={isNotConfirmed ? <DownloadAlertIcon /> : <DownloadIcon />}
                onClick={handleBackupClick}
              >
                {t("Backup Wallet")}
              </NavItemButton>
              <NavItemButton icon={<LockIcon />} onClick={handleLock}>
                {t("Lock Wallet")}
              </NavItemButton>
            </Nav>
          </ScrollContainer>
        </main>
        <footer>
          <BuildVersionPill />
        </footer>
      </Container>
    </Drawer>
  )
}
