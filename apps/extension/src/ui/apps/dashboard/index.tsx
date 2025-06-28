import { PHISHING_PAGE_REDIRECT } from "@polkadot/extension-base/defaults"
import { DEBUG } from "extension-shared"
import { FC, PropsWithChildren, Suspense, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, Route, Routes, useMatch } from "react-router-dom"

import { FullScreenLocked } from "@talisman/components/FullScreenLocked"
import { NavigateWithQuery } from "@talisman/components/NavigateWithQuery"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { api } from "@ui/api"
import { DatabaseErrorAlert } from "@ui/domains/Settings/DatabaseErrorAlert"
import { MigrationProgress } from "@ui/domains/System/MigrationProgress"
import { useLoginCheck } from "@ui/hooks/useLoginCheck"

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
import { AddNetworkPage } from "./routes/Networks/AddNetworkPage"
import { EditNetworkPage } from "./routes/Networks/EditNetworkPage"
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
import { CurrencySettingsPage } from "./routes/Settings/CurrencySettingsPage"
import { GeneralPage } from "./routes/Settings/GeneralPage"
import { LanguagePage } from "./routes/Settings/LanguagePage"
import { MnemonicsPage } from "./routes/Settings/Mnemonics/MnemonicsPage"
import { NetworksTokensPage } from "./routes/Settings/NetworksTokensPage"
import { QrMetadataPage } from "./routes/Settings/QrMetadataPage"
import { SecurityPrivacyPage } from "./routes/Settings/SecurityPrivacyPage"
import { TestPage } from "./routes/TestPage"
import { AddTokenPage } from "./routes/Tokens/AddTokenPage"
import { EditTokenPage } from "./routes/Tokens/EditTokenPage"
import { TokensPage } from "./routes/Tokens/TokensPage"
import { TxHistory } from "./routes/TxHistory"

const DashboardInner = () => {
  return (
    <Suspense fallback={<SuspenseTracker name="Dashboard" />}>
      <Routes>
        <Route path="portfolio/*" element={<PortfolioRoutes />} />
        <Route path="tx-history/*" element={<TxHistory />} />
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
          <Route path="" element={<NavigateWithQuery url="/portfolio" replace />} />
        </Route>
        <Route path="settings">
          <Route path="" element={<Navigate to="/settings/general" replace />} />
          <Route path="general">
            <Route path="" element={<GeneralPage />} />
            <Route path="language" element={<LanguagePage />} />
            <Route path="currency" element={<CurrencySettingsPage />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Route>
          <Route path="address-book" element={<AddressBookPage />} />
          <Route path="connected-sites" element={<ConnectedSitesPage />} />
          <Route path="mnemonics" element={<MnemonicsPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="security-privacy-settings">
            <Route path="" element={<SecurityPrivacyPage />} />
            <Route path="change-password" element={<ChangePasswordPage />} />
            <Route path="autolock" element={<AutoLockTimerPage />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Route>
          <Route path="networks-tokens">
            <Route path="" element={<NetworksTokensPage />} />
            <Route path="asset-discovery" element={<AssetDiscoveryPage />} />
            <Route path="tokens">
              <Route path="" element={<TokensPage />} />
              <Route path="add" element={<AddTokenPage />} />
              <Route path=":id" element={<EditTokenPage />} />
              <Route path="*" element={<Navigate to="" replace />} />
            </Route>
            <Route path="networks">
              <Route path="" element={<NetworksPage />} />
              <Route path="add" element={<AddNetworkPage />} />
              <Route
                path="ethereum"
                element={
                  <Navigate
                    to="/settings/networks-tokens/networks"
                    replace
                    state={{ platform: "ethereum" }}
                  />
                }
              />
              <Route
                path="polkadot"
                element={
                  <Navigate
                    to="/settings/networks-tokens/networks"
                    replace
                    state={{ platform: "polkadot" }}
                  />
                }
              />
              <Route path="*" element={<Navigate to="" replace />} />
            </Route>
            <Route path="network/:id" element={<EditNetworkPage />} />
            <Route path="qr-metadata" element={<QrMetadataPage />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Route>
          <Route path="about" element={<AboutPage />} />
          <Route path="analytics" element={<AnalyticsOptInPage />} />
          {/* Old routes redirects */}
          <Route
            path="qr-metadata"
            element={<Navigate to="networks-tokens/qr-metadata" replace />}
          />
          <Route
            path="change-password"
            element={<Navigate to="/settings/security-privacy-settings/change-password" replace />}
          />
          <Route
            path="autolock"
            element={<Navigate to="/settings/security-privacy-settings/autolock" replace />}
          />
          <Route path="*" element={<Navigate to="" replace />} />
        </Route>
        {/* Old routes redirects */}
        <Route
          path="networks"
          element={<Navigate to="/settings/networks-tokens/networks" replace />}
        />
        <Route path="tokens" element={<Navigate to="/settings/networks-tokens/tokens" replace />} />
        <Route
          path="qr-metadata"
          element={<Navigate to="/settings/networks-tokens/qr-metadata" replace />}
        />
        {DEBUG && <Route path="test" element={<TestPage />} />}
        <Route path="*" element={<NavigateWithQuery url="/portfolio" replace />} />
      </Routes>
    </Suspense>
  )
}

const PreventPhishing: FC<PropsWithChildren> = ({ children }) => {
  const match = useMatch(`${PHISHING_PAGE_REDIRECT}/:url`)

  if (match?.params?.url) return <PhishingPage url={match.params.url} />

  return <>{children}</>
}

const LoginChecker: FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation()
  const { isLoggedIn, isOnboarded, isMigrating } = useLoginCheck()
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
      // else (open from a bookmark?), prompt login
      else api.promptLogin()
    }
  }, [isLoggedIn, isOnboarded])

  if (!isLoggedIn)
    return <FullScreenLocked title={t("Waiting")} subtitle={t("Please unlock the Talisman")} />

  if (isMigrating) return <MigrationProgress />

  return <>{children}</>
}

const Dashboard = () => (
  <PreventPhishing>
    <LoginChecker>
      <DashboardInner />
    </LoginChecker>
    <DatabaseErrorAlert container="fullscreen" />
  </PreventPhishing>
)

export default Dashboard
