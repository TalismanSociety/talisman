import { lazy, Suspense, useEffect, useRef } from "react"
import { Route, Routes, Navigate } from "react-router-dom"
import { useModalSubscription } from "@ui/hooks/useModalSubscription"
import AccountIndex from "./routes/AccountIndex"
import AccountAddTypePicker from "./routes/AccountAddTypePicker"
import AccountAddDerived from "./routes/AccountAddDerived"
import AccountAddJson from "./routes/AccountAddJson"
import { AccountAddSecret } from "./routes/AccountAddSecret"
import SitesConnected from "./routes/SitesConnected"
import Settings from "./routes/Settings"
import Options from "./routes/Options"
import SecurityPrivacySettings from "./routes/SecurityPrivacySettings"
import { FullScreenLoader } from "@talisman/components/FullScreenLoader"
import About from "./routes/About"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { api } from "@ui/api"
import { SendTokensModalProvider } from "@ui/domains/Asset/Send/SendTokensModalContext"
import Layout from "./layout"
import { CustomTokens } from "./routes/CustomTokens"
import { CustomTokensAddOrEdit } from "./routes/CustomTokensAddOrEdit"

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
        <Route path="accounts">
          <Route path="" element={<AccountIndex />} />
          <Route path="add">
            <Route path="" element={<AccountAddTypePicker />} />
            <Route path="derived" element={<AccountAddDerived />} />
            <Route path="json" element={<AccountAddJson />} />
            <Route path="secret/*" element={<AccountAddSecret />} />
            <Route path="ledger/*" element={<AccountAddLedger />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Route>
        </Route>
        <Route path="settings">
          <Route path="" element={<Settings />} />
          <Route path="connected-sites" element={<SitesConnected />} />
          <Route path="security-privacy-settings" element={<SecurityPrivacySettings />} />
          <Route path="options" element={<Options />} />
          <Route path="about" element={<About />} />
        </Route>
        <Route path="tokens">
          <Route path="" element={<CustomTokens />} />
          <Route path="add" element={<CustomTokensAddOrEdit />} />
          <Route path="edit/:id" element={<CustomTokensAddOrEdit />} />
        </Route>
        <Route path="*" element={<Navigate to="/accounts" replace />} />
      </Routes>
    </Suspense>
  )
}

const Dashboard = () => (
  <SendTokensModalProvider>
    <DashboardInner />
  </SendTokensModalProvider>
)

export default Dashboard
