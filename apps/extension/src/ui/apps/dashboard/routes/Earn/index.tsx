import { FC } from "react"
import { Route, Routes } from "react-router-dom"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { DashboardYieldPosition } from "./DashboardYieldPosition"
import { ProductionSelectionPage } from "./EarnPage"

export const EarnRoutes: FC = () => {
  return (
    <DashboardLayout sidebar="accounts">
      <Routes>
        <Route path="" element={<ProductionSelectionPage />} />
        <Route path="yield/:yieldId" element={<DashboardYieldPosition />} />
      </Routes>
    </DashboardLayout>
  )
}
