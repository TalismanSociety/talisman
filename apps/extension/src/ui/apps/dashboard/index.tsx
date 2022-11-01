import { DEBUG } from "@core/constants"
import { PHISHING_PAGE_REDIRECT } from "@polkadot/extension-base/defaults"
import { FullScreenLoader } from "@talisman/components/FullScreenLoader"
import { api } from "@ui/api"
import { AccountExportModalProvider } from "@ui/domains/Account/AccountExportModal"
import { AccountRemoveModalProvider } from "@ui/domains/Account/AccountRemoveModal"
import { AccountRenameModalProvider } from "@ui/domains/Account/AccountRenameModal"
import { AddressFormatterModalProvider } from "@ui/domains/Account/AddressFormatterModal"
import { BuyTokensModalProvider } from "@ui/domains/Asset/Buy/BuyTokensModalContext"
import { ReceiveTokensModalProvider } from "@ui/domains/Asset/Receive/ReceiveTokensModalContext"
import { SendTokensModalProvider } from "@ui/domains/Asset/Send/SendTokensModalContext"
import { SelectedAccountProvider } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { useModalSubscription } from "@ui/hooks/useModalSubscription"
import { Suspense, lazy, useEffect, useRef, ReactNode } from "react"
import { Navigate, Route, Routes, useLocation, useMatch, useRoutes } from "react-router-dom"

import Layout from "./layout"
import About from "./routes/About"
import AccountAddDerived from "./routes/AccountAddDerived"
import AccountAddJson from "./routes/AccountAddJson"
import { AccountAddSecret } from "./routes/AccountAddSecret"
import AccountAddTypePicker from "./routes/AccountAddTypePicker"
import { CustomTokenAdd } from "./routes/CustomTokens/CustomTokenAdd"
import { CustomTokenDetails } from "./routes/CustomTokens/CustomTokenDetails"
import { CustomTokens } from "./routes/CustomTokens/CustomTokens"
import { PhishingPage } from "./routes/PhishingPage"
import { Portfolio } from "./routes/Portfolio"
import Settings from "./routes/Settings"
import { AnalyticsOptIn } from "./routes/Settings/AnalyticsOptIn"
import { AutoLockTimer } from "./routes/Settings/AutoLockTimer"
import ChangePassword from "./routes/Settings/ChangePassword"
import Options from "./routes/Settings/Options"
import SecurityPrivacySettings from "./routes/Settings/SecurityPrivacySettings"
import SitesConnected from "./routes/Settings/SitesConnected"
import { TestPage } from "./routes/TestPage"

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

  return isLoggedIn === "UNKNOWN" ? (
    <FullScreenLoader spin title="Loading" />
  ) : isLoggedIn === "FALSE" ? (
    <FullScreenLoader title="Waiting" subtitle="Please unlock the Talisman" />
  ) : (
    // use an empty layout as fallback to prevent flickering
    <Suspense fallback={<Layout />}>
      <Routes>
        <Route path="portfolio/*" element={<Portfolio />} />
        <Route path="accounts">
          <Route path="add">
            <Route path="" element={<AccountAddTypePicker />} />
            <Route path="derived" element={<AccountAddDerived />} />
            <Route path="json" element={<AccountAddJson />} />
            <Route path="secret/*" element={<AccountAddSecret />} />
            <Route path="ledger/*" element={<AccountAddLedger />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Route>
          <Route path="" element={<Navigate to="/portfolio" />} />
        </Route>
        <Route path="settings">
          <Route path="" element={<Settings />} />
          <Route path="connected-sites" element={<SitesConnected />} />
          <Route path="security-privacy-settings" element={<SecurityPrivacySettings />} />
          <Route path="options" element={<Options />} />
          <Route path="about" element={<About />} />
          <Route path="analytics" element={<AnalyticsOptIn />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="autolock" element={<AutoLockTimer />} />
        </Route>
        <Route path="tokens">
          <Route path="" element={<CustomTokens />} />
          <Route path="add" element={<CustomTokenAdd />} />
          <Route path=":id" element={<CustomTokenDetails />} />
        </Route>
        {DEBUG && <Route path="test" element={<TestPage />} />}
        <Route path="*" element={<Navigate to="/portfolio" replace />} />
      </Routes>
    </Suspense>
  )
}

const PreventPhishing = ({ children }: { children?: ReactNode }) => {
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
            <AddressFormatterModalProvider>
              <SendTokensModalProvider>
                <BuyTokensModalProvider>
                  <ReceiveTokensModalProvider>
                    <DashboardInner />
                  </ReceiveTokensModalProvider>
                </BuyTokensModalProvider>
              </SendTokensModalProvider>
            </AddressFormatterModalProvider>
          </AccountExportModalProvider>
        </AccountRenameModalProvider>
      </AccountRemoveModalProvider>
    </SelectedAccountProvider>
  </PreventPhishing>
)

export default Dashboard

// utility function to reset all the custom EVM networks.
// in case a user contacts support and asks for a way to remove a network, we can tell him to open devtools and run the function
// TODO remove this as soon as we have a management screen for EVM networks
// @ts-ignore
window.clearCustomEthereumNetworks = () => {
  api
    .clearCustomEthereumNetworks()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log("successfully removed all custom EVM networks")
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Failed to remove all custom EVM networks", err)
    })
}
