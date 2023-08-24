import { Navigate, Route, Routes } from "react-router-dom"

import { AccountAddPageProps } from "../types"
import { AccountAddSecretAccountsForm } from "./AccountAddSecretAccountsForm"
import { AccountAddSecretMnemonicForm } from "./AccountAddSecretMnemonicForm"
import { AccountAddSecretProvider } from "./context"

export const AccountAddSecretWizard = ({ onSuccess }: AccountAddPageProps) => (
  <AccountAddSecretProvider onSuccess={onSuccess}>
    <Routes>
      <Route index element={<AccountAddSecretMnemonicForm />} />
      <Route path="multiple" element={<AccountAddSecretAccountsForm />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  </AccountAddSecretProvider>
)
