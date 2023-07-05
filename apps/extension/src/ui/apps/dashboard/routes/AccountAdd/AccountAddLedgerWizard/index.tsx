import { Navigate, Route, Routes } from "react-router-dom"

import { AddLedgerSelectAccount } from "./AddLedgerSelectAccount"
import { AddLedgerSelectNetwork } from "./AddLedgerSelectNetwork"
import { AddLedgerAccountProvider } from "./context"

export const AccountAddLedgerWizard = () => (
  <AddLedgerAccountProvider>
    <Routes>
      <Route path="" element={<AddLedgerSelectNetwork />} />
      <Route path="account" element={<AddLedgerSelectAccount />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  </AddLedgerAccountProvider>
)

// lazy load
export default AccountAddLedgerWizard
