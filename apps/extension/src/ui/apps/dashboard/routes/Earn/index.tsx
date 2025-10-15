import { FC } from "react"
import { Route, Routes } from "react-router-dom"

import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { DashboardYieldPosition } from "./DashboardYieldPosition"
import { ProductionSelectionPage } from "./EarnPage"

export const EarnRoutes: FC = () => {
  return (
    <PortfolioContainer>
      <DashboardLayout sidebar="accounts">
        <Routes>
          <Route path="" element={<ProductionSelectionPage />} />
          <Route path="yield/:yieldId" element={<DashboardYieldPosition />} />
        </Routes>
      </DashboardLayout>
    </PortfolioContainer>
  )
}
