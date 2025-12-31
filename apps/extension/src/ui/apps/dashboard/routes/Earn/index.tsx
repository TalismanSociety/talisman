import { FC } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"

import { DashboardLayout } from "../../layout/DashboardLayout"
import {
  DashboardEarnDiscoverRoute,
  DashboardEarnPage,
  DashboardEarnPositionsRoute,
} from "./DashboardEarnPage"
import { DashboardYieldxyzYieldPositionsPage } from "./DashboardYieldxyzYieldPositionsPage"

export const DashboardEarnRoutes: FC = () => {
  return (
    <PortfolioContainer>
      <DashboardLayout sidebar="accounts">
        <Routes>
          <Route path="" element={<DashboardEarnPage />}>
            <Route index element={<Navigate to="positions" replace />} />
            <Route path="positions" element={<DashboardEarnPositionsRoute />} />
            <Route path="discover" element={<DashboardEarnDiscoverRoute />} />
          </Route>
          <Route
            path="positions/yieldxyz/:yieldId/:address"
            element={<DashboardYieldxyzYieldPositionsPage />}
          />
        </Routes>
      </DashboardLayout>
    </PortfolioContainer>
  )
}
