import { PHISHING_PAGE_REDIRECT } from "@polkadot/extension-base/defaults"
import { FullScreenLoader } from "@talisman/components/FullScreenLoader"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { api } from "@ui/api"
import { AccountExportModalProvider } from "@ui/domains/Account/AccountExportModal"
import { AccountExportPrivateKeyModalProvider } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { AccountRemoveModalProvider } from "@ui/domains/Account/AccountRemoveModal"
import { AccountRenameModalProvider } from "@ui/domains/Account/AccountRenameModal"
import { BuyTokensModalProvider } from "@ui/domains/Asset/Buy/BuyTokensModalContext"
import { SendTokensModalProvider } from "@ui/domains/Asset/Send/SendTokensModalContext"
import { CopyAddressModalProvider } from "@ui/domains/CopyAddress"
import { SelectedAccountProvider } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { useModalSubscription } from "@ui/hooks/useModalSubscription"
import { FC, PropsWithChildren, Suspense, lazy, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, Route, Routes, useMatch } from "react-router-dom"

import { DashboardLayout } from "./layout/DashboardLayout"
import { AccounAddDerivedPage } from "./routes/AccountAdd/AccountAddDerivedPage"
import { AccountAddJsonPage } from "./routes/AccountAdd/AccountAddJsonPage"
import { AccountAddQrWizard } from "./routes/AccountAdd/AccountAddQrWizard"
import { AccountAddSecretWizard } from "./routes/AccountAdd/AccountAddSecretWizard"
import { AccountAddTypePickerPage } from "./routes/AccountAdd/AccountAddTypePickerPage"
import { AccountAddWatchedPage } from "./routes/AccountAdd/AccountAddWatchedPage"
import { NetworkPage } from "./routes/Networks/NetworkPage"
import { NetworksPage } from "./routes/Networks/NetworksPage"
import { PhishingPage } from "./routes/PhishingPage"
import { PortfolioRoutes } from "./routes/Portfolio"
import { AboutPage } from "./routes/Settings/AboutPage"
import { AddressBookPage } from "./routes/Settings/AddressBookPage"
import { AnalyticsOptInPage } from "./routes/Settings/AnalyticsOptInPage"
import { AutoLockTimerPage } from "./routes/Settings/AutoLockTimerPage"
import { ChangePasswordPage } from "./routes/Settings/ChangePasswordPage"
import { LanguageSettingsPage } from "./routes/Settings/LanguageSettingsPage"
import { OptionsPage } from "./routes/Settings/OptionsPage"
import { SecurityPrivacySettingsPage } from "./routes/Settings/SecurityPrivacySettingsPage"
import { SettingsPage } from "./routes/Settings/SettingsPage"
import { TrustedSitesPage } from "./routes/Settings/TrustedSitesPage"
import { AddCustomTokenPage } from "./routes/Tokens/AddCustomTokenPage"
import { TokenPage } from "./routes/Tokens/TokenPage"
import { TokensPage } from "./routes/Tokens/TokensPage"

// lazy load this one to prevent polkadot/hw-ledger to be loaded (slow)
const AccountAddLedgerWizard = lazy(() => import("./routes/AccountAdd/AccountAddLedgerWizard"))

const DashboardInner = () => {
  const isLoggedIn = useIsLoggedIn()
  const isOnboarded = useIsOnboarded()
  const wasLoggedIn = useRef(false)
  useModalSubscription()

  useEffect(() => {
    if (isLoggedIn === "TRUE") wasLoggedIn.current = true
  }, [isLoggedIn])

  // if we're not onboarded, redirect to onboard
  useEffect(() => {
    if (isOnboarded === "FALSE")
      window.location.href = window.location.href.replace("dashboard.html", "onboarding.html")
    else if (isOnboarded === "TRUE" && isLoggedIn === "FALSE") {
      // if user was logged in and locked the extension from the popup, close the tab
      if (wasLoggedIn.current) window.close()
      // else (open from a bookmark ?), prompt login
      else api.promptLogin(true)
    }
  }, [isLoggedIn, isOnboarded])

  const { t } = useTranslation()

  if (isLoggedIn === "UNKNOWN") return null

  if (isLoggedIn === "FALSE")
    return <FullScreenLoader title={t("Waiting")} subtitle={t("Please unlock the Talisman")} />

  return (
    // use an empty layout as fallback to prevent flickering
    <Suspense
      fallback={
        <>
          <SuspenseTracker name="Dashboard" />
          <DashboardLayout />
        </>
      }
    >
      <Routes>
        <Route path="portfolio/*" element={<PortfolioRoutes />} />
        <Route path="accounts">
          <Route path="add">
            <Route path="" element={<AccountAddTypePickerPage />} />
            <Route path="derived" element={<AccounAddDerivedPage />} />
            <Route path="json" element={<AccountAddJsonPage />} />
            <Route path="secret/*" element={<AccountAddSecretWizard />} />
            <Route path="ledger/*" element={<AccountAddLedgerWizard />} />
            <Route path="qr/*" element={<AccountAddQrWizard />} />
            <Route path="watched" element={<AccountAddWatchedPage />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Route>
          <Route path="" element={<Navigate to="/portfolio" />} />
        </Route>
        <Route path="settings">
          <Route path="" element={<SettingsPage />} />
          <Route path="connected-sites" element={<TrustedSitesPage />} />
          <Route path="address-book" element={<AddressBookPage />} />
          <Route path="language" element={<LanguageSettingsPage />} />
          <Route path="security-privacy-settings" element={<SecurityPrivacySettingsPage />} />
          <Route path="options" element={<OptionsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="analytics" element={<AnalyticsOptInPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="autolock" element={<AutoLockTimerPage />} />
        </Route>
        <Route path="tokens">
          <Route path="" element={<TokensPage />} />
          <Route path="add" element={<AddCustomTokenPage />} />
          <Route path=":id" element={<TokenPage />} />
        </Route>
        <Route path="networks">
          <Route path="" element={<NetworksPage />} />
          <Route path="add" element={<NetworkPage />} />
          <Route path=":id" element={<NetworkPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/portfolio" replace />} />
      </Routes>
    </Suspense>
  )
}

const PreventPhishing: FC<PropsWithChildren> = ({ children }) => {
  const match = useMatch(`${PHISHING_PAGE_REDIRECT}/:url`)

  if (match?.params?.url) return <PhishingPage url={match.params.url} />

  return <>{children}</>
}

const Dashboard = () => (
  <PreventPhishing>
    <SelectedAccountProvider>
      <AccountRemoveModalProvider>
        <AccountRenameModalProvider>
          <AccountExportModalProvider>
            <AccountExportPrivateKeyModalProvider>
              <CopyAddressModalProvider>
                <SendTokensModalProvider>
                  <BuyTokensModalProvider>
                    <DashboardInner />
                  </BuyTokensModalProvider>
                </SendTokensModalProvider>
              </CopyAddressModalProvider>
            </AccountExportPrivateKeyModalProvider>
          </AccountExportModalProvider>
        </AccountRenameModalProvider>
      </AccountRemoveModalProvider>
    </SelectedAccountProvider>
  </PreventPhishing>
)

export default Dashboard
