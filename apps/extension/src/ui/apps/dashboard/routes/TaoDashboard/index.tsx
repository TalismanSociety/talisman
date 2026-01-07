import { Navigate, Route, Routes } from "react-router-dom"

import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"

import { DashboardLayout } from "../../layout"
import { TaoDashboardSubnetPage } from "./TaoDashboardSubnetPage"
import { TaoDashboardSubnetsPage } from "./TaoDashboardSubnetsPage"

export const TaoDashboardRoutes = () => {
  // TODO check: we might not need the portfolio container as we dont use an accounts sidebar
  return (
    <PortfolioContainer>
      <DashboardLayout sidebar="none">
        <Routes>
          <Route path="subnets" element={<TaoDashboardSubnetsPage />} />
          <Route path="subnets/:subnetId" element={<TaoDashboardSubnetPage />} />
          <Route index element={<Navigate to="subnets" replace />} />
          <Route path="*" element={<Navigate to="subnets" replace />} />
        </Routes>
      </DashboardLayout>
    </PortfolioContainer>
  )
}
