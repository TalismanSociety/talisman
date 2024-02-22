import { PHISHING_PAGE_REDIRECT } from "@polkadot/extension-base/defaults"
import { FullScreenLoader } from "@talisman/components/FullScreenLoader"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { api } from "@ui/api"
import { AssetDiscoveryDashboardAlert } from "@ui/domains/AssetDiscovery/AssetDiscoveryDashboardAlert"
import { useSelectedAccount } from "@ui/domains/Portfolio/useSelectedAccount"
import { DatabaseErrorAlert } from "@ui/domains/Settings/DatabaseErrorAlert"
import { useLoginCheck } from "@ui/hooks/useLoginCheck"
import { useModalSubscription } from "@ui/hooks/useModalSubscription"
import { FC, PropsWithChildren, Suspense, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, Route, Routes, useMatch, useSearchParams } from "react-router-dom"

import { DashboardLayout } from "./layout/DashboardLayout"
import { AccountAddMenu } from "./routes/AccountAdd"
import { AccountAddDcentDashboardWizard } from "./routes/AccountAdd/AccountAddDcentWizard"
import { AccountAddDerivedPage } from "./routes/AccountAdd/AccountAddDerivedPage"
import { AccountAddJsonPage } from "./routes/AccountAdd/AccountAddJsonPage"
import { AccountAddLedgerDashboardWizard } from "./routes/AccountAdd/AccountAddLedgerWizard"
import { AccountAddMnemonicDashboardWizard } from "./routes/AccountAdd/AccountAddMnemonicWizard"
import { AccountAddPrivateKeyDashboardPage } from "./routes/AccountAdd/AccountAddPrivateKeyPage"
import { AccountAddQrDashboardWizard } from "./routes/AccountAdd/AccountAddQrWizard"
import { AccountAddSignetDashboardWizard } from "./routes/AccountAdd/AccountAddSignetWizard"
import { AccountAddWatchedPage } from "./routes/AccountAdd/AccountAddWatchedPage"
import { NetworkPage } from "./routes/Networks/NetworkPage"
import { NetworksPage } from "./routes/Networks/NetworksPage"
import { PhishingPage } from "./routes/PhishingPage"
import { PortfolioRoutes } from "./routes/Portfolio"
import { AboutPage } from "./routes/Settings/AboutPage"
import { AccountsPage } from "./routes/Settings/Accounts"
import { AddressBookPage } from "./routes/Settings/AddressBookPage"
import { AnalyticsOptInPage } from "./routes/Settings/AnalyticsOptInPage"
import { AssetDiscoveryPage } from "./routes/Settings/AssetsDiscovery/AssetDiscoveryPage"
import { AutoLockTimerPage } from "./routes/Settings/AutoLockTimerPage"
import { ChangePasswordPage } from "./routes/Settings/ChangePasswordPage"
import { ConnectedSitesPage } from "./routes/Settings/ConnectedSitesPage"
import CurrencySettingsPage from "./routes/Settings/CurrencySettingsPage"
import { GeneralPage } from "./routes/Settings/GeneralPage"
import { LanguagePage } from "./routes/Settings/LanguagePage"
import { MnemonicsPage } from "./routes/Settings/Mnemonics/MnemonicsPage"
import { NetworksTokensPage } from "./routes/Settings/NetworksTokensPage"
import { QrMetadataPage } from "./routes/Settings/QrMetadataPage"
import { SecurityPrivacyPage } from "./routes/Settings/SecurityPrivacyPage"
import { AddCustomTokenPage } from "./routes/Tokens/AddCustomTokenPage"
import { TokenPage } from "./routes/Tokens/TokenPage"
import { TokensPage } from "./routes/Tokens/TokensPage"

const DashboardInner = () => {
  useModalSubscription()

  return (
    // use an empty layout as fallback to prevent flickering
    <Suspense
      fallback={
        <>
          <DashboardLayout />
          <SuspenseTracker name="Dashboard" />
        </>
      }
    >
      <Routes>
        <Route path="portfolio/*" element={<PortfolioRoutes />} />
        <Route path="accounts">
          <Route path="add">
            <Route index element={<AccountAddMenu />} />
            <Route path="derived" element={<AccountAddDerivedPage />} />
            <Route path="json" element={<AccountAddJsonPage />} />
            <Route path="mnemonic/*" element={<AccountAddMnemonicDashboardWizard />} />
            <Route path="pk/*" element={<AccountAddPrivateKeyDashboardPage />} />
            <Route path="ledger/*" element={<AccountAddLedgerDashboardWizard />} />
            <Route path="qr/*" element={<AccountAddQrDashboardWizard />} />
            <Route path="watched" element={<AccountAddWatchedPage />} />
            <Route path="dcent/*" element={<AccountAddDcentDashboardWizard />} />
            <Route path="signet/*" element={<AccountAddSignetDashboardWizard />} />
            <Route path="*" element={<Navigate to="/accounts/add" replace />} />
          </Route>
          <Route path="" element={<Navigate to="/portfolio" />} />
        </Route>
        <Route path="settings">
          <Route path="" element={<Navigate to="/settings/general" replace />} />
          <Route path="general" element={<GeneralPage />} />
          <Route path="language" element={<LanguagePage />} />
          <Route path="currency" element={<CurrencySettingsPage />} />
          <Route path="address-book" element={<AddressBookPage />} />
          <Route path="connected-sites" element={<ConnectedSitesPage />} />
          <Route path="mnemonics" element={<MnemonicsPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="security-privacy-settings" element={<SecurityPrivacyPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="autolock" element={<AutoLockTimerPage />} />
          <Route path="networks-tokens" element={<NetworksTokensPage />} />
          <Route path="qr-metadata" element={<QrMetadataPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="analytics" element={<AnalyticsOptInPage />} />
          <Route path="asset-discovery" element={<AssetDiscoveryPage />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Route>
        <Route path="tokens">
          <Route path="" element={<TokensPage />} />
          <Route path="add" element={<AddCustomTokenPage />} />
          <Route path=":id" element={<TokenPage />} />
        </Route>
        <Route path="networks">
          <Route path="" element={<Navigate to="/networks/ethereum" replace />} />
          <Route path=":networksType" element={<NetworksPage />} />
          <Route path=":networksType/add" element={<NetworkPage />} />
          <Route path=":networksType/:id" element={<NetworkPage />} />
          <Route path="*" element={<Navigate to="" replace />} />
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

const SelectedAccountChecker: FC<PropsWithChildren> = ({ children }) => {
  // popup may pass an account in the query string
  // we need to update this before first sidebar render to prevent flickering
  const { select } = useSelectedAccount()
  const [searchParams, updateSearchParams] = useSearchParams()

  useEffect(() => {
    const account = searchParams.get("account")
    if (!account) return

    const newSearchPrams = new URLSearchParams(searchParams)
    select(account === "all" ? undefined : account)
    newSearchPrams.delete("account")
    updateSearchParams(newSearchPrams, { replace: true })
  }, [searchParams, select, updateSearchParams])

  // don't render if search param is still there
  if (searchParams.get("account")) return null

  return <>{children}</>
}

const LoginChecker: FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation()
  const { isLoggedIn, isOnboarded } = useLoginCheck()
  const wasLoggedIn = useRef(false)

  useEffect(() => {
    if (isLoggedIn) wasLoggedIn.current = true
  }, [isLoggedIn])

  // if we're not onboarded, redirect to onboard
  useEffect(() => {
    if (!isOnboarded)
      window.location.href = window.location.href.replace("dashboard.html", "onboarding.html")
    else if (!isLoggedIn) {
      // if user was logged in and locked the extension from the popup, close the tab
      if (wasLoggedIn.current) window.close()
      // else (open from a bookmark ?), prompt login
      else api.promptLogin(true)
    }
  }, [isLoggedIn, isOnboarded])

  if (!isLoggedIn)
    return <FullScreenLoader title={t("Waiting")} subtitle={t("Please unlock the Talisman")} />

  return <>{children}</>
}

const Dashboard = () => (
  <PreventPhishing>
    <LoginChecker>
      <SelectedAccountChecker>
        <DashboardInner />
      </SelectedAccountChecker>
    </LoginChecker>
    <DatabaseErrorAlert container="fullscreen" />
    <AssetDiscoveryDashboardAlert />
  </PreventPhishing>
)

export default Dashboard
