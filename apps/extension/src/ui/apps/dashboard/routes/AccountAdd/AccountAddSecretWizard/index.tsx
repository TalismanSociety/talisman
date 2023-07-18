import { Navigate, Route, Routes } from "react-router-dom"

import { AccountAddSecretAccountsPage } from "./AccountAddSecretAccountsPage"
import { AccountAddSecretMnemonicPage } from "./AccountAddSecretMnemonicPage"
import { AccountAddSecretProvider } from "./context"

export const AccountAddSecretWizard = () => (
  <AccountAddSecretProvider>
    <Routes>
      <Route path="" element={<AccountAddSecretMnemonicPage />} />
      <Route path="accounts" element={<AccountAddSecretAccountsPage />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  </AccountAddSecretProvider>
)
