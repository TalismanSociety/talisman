import { Navigate, Route, Routes } from "react-router-dom"

import { AccountAddPageProps } from "../types"
import { AccountAddMnemonicProvider } from "./context"
import { AccountAddMnemonicForm } from "./MnemonicForm"
import { AccountAddMnemonicAccountsForm } from "./MultipleAccountsForm"

const AccountAddMnemonicWizard = ({ onSuccess }: AccountAddPageProps) => (
  <AccountAddMnemonicProvider onSuccess={onSuccess}>
    <Routes>
      <Route index element={<AccountAddMnemonicForm />} />
      <Route path="multiple" element={<AccountAddMnemonicAccountsForm />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  </AccountAddMnemonicProvider>
)

export default AccountAddMnemonicWizard
