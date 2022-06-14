import { Navigate, Route, Routes } from "react-router-dom"
import { AccountAddSecretAccounts } from "./AccountAddSecretAccounts"
import { AccountAddSecretMnemonic } from "./AccountAddSecretMnemonic"
import { AccountAddSecretProvider } from "./context"

export const AccountAddSecret = () => (
  <AccountAddSecretProvider>
    <Routes>
      <Route path="" element={<AccountAddSecretMnemonic />} />
      <Route path="accounts" element={<AccountAddSecretAccounts />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  </AccountAddSecretProvider>
)
