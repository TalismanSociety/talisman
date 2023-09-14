import { Navigate, Route, Routes } from "react-router-dom"

import { AccountAddPageProps } from "../types"
import { ConnectDcentAccountsPage } from "./ConnectDcentAccountsPage"
import { ConnectDcentBridgePage } from "./ConnectDcentBridgePage"
import { DcentConnectProvider } from "./context"

export const AccountAddDcentWizard = ({ onSuccess }: AccountAddPageProps) => (
  <DcentConnectProvider onSuccess={onSuccess}>
    <Routes>
      <Route path="" element={<ConnectDcentBridgePage />} />
      <Route path="accounts" element={<ConnectDcentAccountsPage />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  </DcentConnectProvider>
)
