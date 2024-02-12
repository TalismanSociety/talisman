import { Navigate, Route, Routes } from "react-router-dom"

import { AccountAddPageProps } from "../types"
import { ConnectSignetPage } from "./ConnectSignetPage"
import { ConnectSignetSelectAccounts } from "./ConnectSignetSelectAccounts"
import { SignetConnectProvider } from "./context"

export const AccountAddSignetWizard = ({ onSuccess }: AccountAddPageProps) => (
  <SignetConnectProvider onSuccess={onSuccess}>
    <Routes>
      <Route path="" element={<ConnectSignetPage />} />
      <Route path="accounts" element={<ConnectSignetSelectAccounts />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  </SignetConnectProvider>
)
