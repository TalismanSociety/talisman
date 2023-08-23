import { Navigate, Route, Routes } from "react-router-dom"

import { AddLedgerSelectAccount } from "./AddLedgerSelectAccount"
import { AddLedgerSelectNetwork } from "./AddLedgerSelectNetwork"
import { AddLedgerAccountProvider } from "./context"

export const AccountAddLedgerWizard = ({ onSuccess }: { onSuccess: (address: string) => void }) => (
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
