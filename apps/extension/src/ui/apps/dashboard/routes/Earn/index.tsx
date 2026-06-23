import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import type { FC } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { DashboardEarnDefiPositionPage } from "./DashboardEarnDefiPositionPage"
import {
  DashboardEarnDiscoverRoute,
  DashboardEarnPage,
  DashboardEarnPositionsRoute,
} from "./DashboardEarnPage"
import { DashboardSeekStakingPositionPage } from "./DashboardSeekStakingPositionPage"
import { DashboardYieldxyzYieldPositionsPage } from "./DashboardYieldxyzYieldPositionsPage"

export const DashboardEarnRoutes: FC = () => {
  return (
    <PortfolioContainer>
      <DashboardLayout sidebar="accounts" className="min-w-325">
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
          <Route path="positions/seek/:address" element={<DashboardSeekStakingPositionPage />} />
          <Route path="positions/defi/:positionId" element={<DashboardEarnDefiPositionPage />} />
        </Routes>
      </DashboardLayout>
    </PortfolioContainer>
  )
}
