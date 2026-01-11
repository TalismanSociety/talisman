import { Navigate, Route, Routes } from "react-router-dom"

import type { AccountAddPageProps } from "../types"
import { AddLedgerSelectAccount } from "./AddLedgerSelectAccount"
import { AddLedgerSelectNetwork } from "./AddLedgerSelectNetwork"
import { AddLedgerAccountProvider } from "./context"

const AccountAddLedgerWizard = ({ onSuccess }: AccountAddPageProps) => (
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
