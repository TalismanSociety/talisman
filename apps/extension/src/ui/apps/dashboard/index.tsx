import { PHISHING_PAGE_REDIRECT } from "@polkadot/extension-base/defaults"
import { FullScreenLoader } from "@talisman/components/FullScreenLoader"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { api } from "@ui/api"
import { AccountExportModalProvider } from "@ui/domains/Account/AccountExportModal"
import { AccountExportPrivateKeyModalProvider } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { AccountRemoveModalProvider } from "@ui/domains/Account/AccountRemoveModal"
import { AccountRenameModalProvider } from "@ui/domains/Account/AccountRenameModal"
import { BuyTokensModalProvider } from "@ui/domains/Asset/Buy/BuyTokensModalContext"
import { CopyAddressModalProvider } from "@ui/domains/CopyAddress"
import { SelectedAccountProvider } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { useModalSubscription } from "@ui/hooks/useModalSubscription"
import { FC, PropsWithChildren, Suspense, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, Route, Routes, useMatch } from "react-router-dom"

import { DashboardLayout } from "./layout/DashboardLayout"
import { AccountAddMenu } from "./routes/AccountAdd"
import { AccountAddDcentDashboardWizard } from "./routes/AccountAdd/AccountAddDcentWizard"
import { AccountAddDerivedPage } from "./routes/AccountAdd/AccountAddDerivedPage"
import { AccountAddJsonPage } from "./routes/AccountAdd/AccountAddJsonPage"
import { AccountAddLedgerDashboardWizard } from "./routes/AccountAdd/AccountAddLedgerWizard"
import { AccountAddQrDashboardWizard } from "./routes/AccountAdd/AccountAddQrWizard"
import { AccountAddSecretDashboardWizard } from "./routes/AccountAdd/AccountAddSecretWizard"
import { AccountAddWatchedPage } from "./routes/AccountAdd/AccountAddWatchedPage"
import { NetworkPage } from "./routes/Networks/NetworkPage"
import { NetworksPage } from "./routes/Networks/NetworksPage"
import { PhishingPage } from "./routes/PhishingPage"
import { PortfolioRoutes } from "./routes/Portfolio"
import { AboutPage } from "./routes/Settings/AboutPage"
import { AccountsPage } from "./routes/Settings/Accounts"
import { DeleteFolderModalProvider } from "./routes/Settings/Accounts/DeleteFolderModal"
import { NewFolderModalProvider } from "./routes/Settings/Accounts/NewFolderModal"
import { RenameFolderModalProvider } from "./routes/Settings/Accounts/RenameFolderModal"
import { AddressBookPage } from "./routes/Settings/AddressBookPage"
import { AnalyticsOptInPage } from "./routes/Settings/AnalyticsOptInPage"
import { AutoLockTimerPage } from "./routes/Settings/AutoLockTimerPage"
import { ChangePasswordPage } from "./routes/Settings/ChangePasswordPage"
import { ConnectedSitesPage } from "./routes/Settings/ConnectedSitesPage"
import { GeneralPage } from "./routes/Settings/GeneralPage"
import { LanguagePage } from "./routes/Settings/LanguagePage"
import { MnemonicsPage } from "./routes/Settings/Mnemonics/MnemonicsPage"
import { NetworksTokensPage } from "./routes/Settings/NetworksTokensPage"
import { SecurityPrivacyPage } from "./routes/Settings/SecurityPrivacyPage"
import { AddCustomTokenPage } from "./routes/Tokens/AddCustomTokenPage"
import { TokenPage } from "./routes/Tokens/TokenPage"
import { TokensPage } from "./routes/Tokens/TokensPage"

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
            <Route index element={<AccountAddMenu />} />
            <Route path="derived" element={<AccountAddDerivedPage />} />
            <Route path="json" element={<AccountAddJsonPage />} />
            <Route path="secret/*" element={<AccountAddSecretDashboardWizard />} />
            <Route path="ledger/*" element={<AccountAddLedgerDashboardWizard />} />
            <Route path="qr/*" element={<AccountAddQrDashboardWizard />} />
            <Route path="watched" element={<AccountAddWatchedPage />} />
            <Route path="dcent/*" element={<AccountAddDcentDashboardWizard />} />
            <Route path="*" element={<Navigate to="/accounts/add" replace />} />
          </Route>
          <Route path="" element={<Navigate to="/portfolio" />} />
        </Route>
        <Route path="settings">
          <Route path="" element={<Navigate to="/settings/general" replace />} />
          <Route path="general" element={<GeneralPage />} />
          <Route path="language" element={<LanguagePage />} />
          <Route path="address-book" element={<AddressBookPage />} />
          <Route path="connected-sites" element={<ConnectedSitesPage />} />
          <Route path="mnemonics" element={<MnemonicsPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="security-privacy-settings" element={<SecurityPrivacyPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="autolock" element={<AutoLockTimerPage />} />
          <Route path="networks-tokens" element={<NetworksTokensPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="analytics" element={<AnalyticsOptInPage />} />
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

// TODO move NewFolderModalProvider, RenameFolderModalProvider, DeleteFolderModalProvider inside the only page that uses them
const Dashboard = () => (
  <PreventPhishing>
    <SelectedAccountProvider>
      <AccountRemoveModalProvider>
        <AccountRenameModalProvider>
          <AccountExportModalProvider>
            <AccountExportPrivateKeyModalProvider>
              <CopyAddressModalProvider>
                <BuyTokensModalProvider>
                  <NewFolderModalProvider>
                    <RenameFolderModalProvider>
                      <DeleteFolderModalProvider>
                        <DashboardInner />
                      </DeleteFolderModalProvider>
                    </RenameFolderModalProvider>
                  </NewFolderModalProvider>
                </BuyTokensModalProvider>
              </CopyAddressModalProvider>
            </AccountExportPrivateKeyModalProvider>
          </AccountExportModalProvider>
        </AccountRenameModalProvider>
      </AccountRemoveModalProvider>
    </SelectedAccountProvider>
  </PreventPhishing>
)

export default Dashboard
