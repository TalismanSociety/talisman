import { Navigate, Route, Routes } from "react-router-dom"

import { AccountAddPageProps } from "../types"
import { AccountAddSecretProvider } from "./context"
import { AccountAddMnemonicForm } from "./MnemonicForm"
import { AccountAddMnemonicAccountsForm } from "./MultipleAccountsForm"

export const AccountAddSecretWizard = ({ onSuccess }: AccountAddPageProps) => (
  <AccountAddSecretProvider onSuccess={onSuccess}>
    <Routes>
      <Route index element={<AccountAddMnemonicForm />} />
      <Route path="multiple" element={<AccountAddMnemonicAccountsForm />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  </AccountAddSecretProvider>
)
