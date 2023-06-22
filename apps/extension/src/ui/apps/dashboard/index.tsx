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

import Layout from "./layout"
import About from "./routes/About"
import AccountAddDerived from "./routes/AccountAddDerived"
import AccountAddJson from "./routes/AccountAddJson/AccountAddJson"
import { AccountAddQr } from "./routes/AccountAddQr"
import { AccountAddSecret } from "./routes/AccountAddSecret"
import AccountAddTypePicker from "./routes/AccountAddTypePicker"
import { AccountAddWatched } from "./routes/AccountAddWatched"
import { NetworkPage } from "./routes/Networks/NetworkPage"
import { NetworksPage } from "./routes/Networks/NetworksPage"
import { PhishingPage } from "./routes/PhishingPage"
import { Portfolio } from "./routes/Portfolio"
import Settings from "./routes/Settings"
import AddressBook from "./routes/Settings/AddressBook"
import { AnalyticsOptIn } from "./routes/Settings/AnalyticsOptIn"
import { AutoLockTimer } from "./routes/Settings/AutoLockTimer"
import ChangePassword from "./routes/Settings/ChangePassword"
import { LanguageSettings } from "./routes/Settings/LanguageSettings"
import Options from "./routes/Settings/Options"
import SecurityPrivacySettings from "./routes/Settings/SecurityPrivacySettings"
import SitesConnected from "./routes/Settings/SitesConnected"
import { AddCustomTokenPage } from "./routes/Tokens/AddCustomTokenPage"
import { TokenPage } from "./routes/Tokens/TokenPage"
import { TokensPage } from "./routes/Tokens/TokensPage"

// lazy load this one to prevent polkadot/hw-ledger to be loaded (slow)
const AccountAddLedger = lazy(() => import("./routes/AccountAddLedger"))

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

  return isLoggedIn === "UNKNOWN" ? (
    <FullScreenLoader spin title={t("Loading")} />
  ) : isLoggedIn === "FALSE" ? (
    <FullScreenLoader title={t("Waiting")} subtitle={t("Please unlock the Talisman")} />
  ) : (
    // use an empty layout as fallback to prevent flickering
    <Suspense
      fallback={
        <>
          <SuspenseTracker name="Dashboard" />
          <Layout />
        </>
      }
    >
      <Routes>
        <Route path="portfolio/*" element={<Portfolio />} />
        <Route path="accounts">
          <Route path="add">
            <Route path="" element={<AccountAddTypePicker />} />
            <Route path="derived" element={<AccountAddDerived />} />
            <Route path="json" element={<AccountAddJson />} />
            <Route path="secret/*" element={<AccountAddSecret />} />
            <Route path="ledger/*" element={<AccountAddLedger />} />
            <Route path="qr/*" element={<AccountAddQr />} />
            <Route path="watched" element={<AccountAddWatched />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Route>
          <Route path="" element={<Navigate to="/portfolio" />} />
        </Route>
        <Route path="settings">
          <Route path="" element={<Settings />} />
          <Route path="connected-sites" element={<SitesConnected />} />
          <Route path="address-book" element={<AddressBook />} />
          <Route path="language" element={<LanguageSettings />} />
          <Route path="security-privacy-settings" element={<SecurityPrivacySettings />} />
          <Route path="options" element={<Options />} />
          <Route path="about" element={<About />} />
          <Route path="analytics" element={<AnalyticsOptIn />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="autolock" element={<AutoLockTimer />} />
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
