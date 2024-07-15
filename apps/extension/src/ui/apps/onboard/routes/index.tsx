import { Navigate, Route, Routes } from "react-router-dom"

import { OnboardStageWrapper } from "../components/OnboardStageWrapper"
import { AddAccountPage } from "./AddAccount"
import { AccountAddDerivedPage } from "./AddAccount/AccountAddDerivedPage"
import { AccountAddJsonOnboardPage } from "./AddAccount/AccountAddJsonPage"
import { AccountAddLedgerOnboardWizard } from "./AddAccount/AccountAddLedgerWizard"
import { AccountAddMnemonicOnboardWizard } from "./AddAccount/AccountAddMnemonicWizard"
import { AccountAddPrivateKeyOnboardWizard } from "./AddAccount/AccountAddPrivateKeyPage"
import { AccountAddQrOnboardWizard } from "./AddAccount/AccountAddQrWizard"
import { AccountAddSignetOnboardingWizard } from "./AddAccount/AccountAddSignetWizard"
import { AccountAddWatchedPage } from "./AddAccount/AccountAddWatchedPage"
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
            <Route path="json" element={<AccountAddJsonOnboardPage />} />
            <Route path="mnemonic/*" element={<AccountAddMnemonicOnboardWizard />} />
            <Route path="pk/*" element={<AccountAddPrivateKeyOnboardWizard />} />
            <Route path="ledger/*" element={<AccountAddLedgerOnboardWizard />} />
            <Route path="qr/*" element={<AccountAddQrOnboardWizard />} />
            <Route path="watched" element={<AccountAddWatchedPage />} />
            <Route path="signet/*" element={<AccountAddSignetOnboardingWizard />} />
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
