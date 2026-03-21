import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import { Navigate, Route, Routes } from "react-router-dom"

import { DashboardLayout } from "../../layout"
import { TaoDashboardSubnetPage } from "./TaoDashboardSubnetPage"
import { TaoDashboardSubnetsPage } from "./TaoDashboardSubnetsPage"

export const TaoDashboardRoutes = () => {
  return (
    <PortfolioContainer>
      <Routes>
        <Route
          path="subnets/:netuid"
          element={
            <DashboardLayout sidebar="none" className="min-w-[81.25rem]">
              <TaoDashboardSubnetPage />
            </DashboardLayout>
          }
        />
        <Route
          path="subnets"
          element={
            <DashboardLayout sidebar="accounts" className="min-w-[81.25rem]">
              <TaoDashboardSubnetsPage />
            </DashboardLayout>
          }
        />
        <Route index element={<Navigate to="subnets" replace />} />
        <Route path="*" element={<Navigate to="subnets" replace />} />
      </Routes>
    </PortfolioContainer>
  )
}
