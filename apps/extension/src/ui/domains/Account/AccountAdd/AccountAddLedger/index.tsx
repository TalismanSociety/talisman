import { Navigate, Route, Routes } from "react-router-dom"

import { AccountAddPageProps } from "../types"
import { AddLedgerSelectAccount } from "./AddLedgerSelectAccount"
import { AddLedgerSelectNetwork } from "./AddLedgerSelectNetwork"
import { AddLedgerAccountProvider } from "./context"

export const AccountAddLedgerWizard = ({ onSuccess }: AccountAddPageProps) => (
  <AddLedgerAccountProvider onSuccess={onSuccess}>
    <Routes>
      <Route index element={<AddLedgerSelectNetwork />} />
      <Route path="account" element={<AddLedgerSelectAccount />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  </AddLedgerAccountProvider>
)

// lazy load
export default AccountAddLedgerWizard
