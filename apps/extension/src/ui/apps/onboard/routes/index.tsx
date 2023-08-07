import { Navigate, Route, Routes } from "react-router-dom"

import { OnboardStageWrapper } from "../components/OnboardStageWrapper"
import { AddAccountPage } from "./AddAccount"
import { AccountAddDerivedPage } from "./AddAccount/AccountAddDerivedPage"
import { AccountAddJsonPage } from "./AddAccount/AccountAddJsonPage"
import { AccountAddSecretOnboardWizard } from "./AddAccount/AccountAddSecretWizard"
import { PasswordPage } from "./Password"
import { PrivacyPage } from "./Privacy"
import { SuccessPage } from "./Success"
import { WelcomePage } from "./Welcome"

const OnboardingRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="password" element={<OnboardStageWrapper stage={1} />}>
        <Route index element={<PasswordPage />} />
      </Route>
      <Route path="privacy" element={<OnboardStageWrapper stage={2} />}>
        <Route index element={<PrivacyPage />} />
      </Route>
      <Route path="accounts">
        <Route path="add">
          <Route element={<OnboardStageWrapper stage={3} />}>
            <Route index element={<AddAccountPage />} />
            <Route path="derived" element={<AccountAddDerivedPage />} />
            <Route path="json" element={<AccountAddJsonPage />} />
            <Route path="secret/*" element={<AccountAddSecretOnboardWizard />} />
            {/* <Route path="ledger/*" element={<AccountAddLedgerWizard />} />
            <Route path="qr/*" element={<AccountAddQrWizard />} />
            <Route path="watched" element={<AccountAddWatchedPage />} /> */}
            <Route path="*" element={<Navigate to="" replace />} />
          </Route>
        </Route>
      </Route>
      <Route path="success" element={<OnboardStageWrapper stage={4} />}>
        <Route index element={<SuccessPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default OnboardingRoutes
