import { Navigate, Route, Routes } from "react-router-dom"

import { ConnectDcentAccountsPage } from "./ConnectDcentAccountsPage"
import { ConnectDcentBridgePage } from "./ConnectDcentBridgePage"

export const AccountAddDcentWizard = () => (
  <Routes>
    <Route path="" element={<ConnectDcentBridgePage />} />
    <Route path="accounts" element={<ConnectDcentAccountsPage />} />
    <Route path="*" element={<Navigate to="" replace />} />
  </Routes>
)
