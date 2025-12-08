import { FC } from "react"
import { Route, Routes } from "react-router-dom"

import { EarnAssetsStateProvider } from "@ui/domains/Earn/context/EarnAssetsStateContext"
import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { DashboardEarnPage } from "./DashboardEarnPage"
import { DashboardYieldPositionPage } from "./DashboardYieldPositionPage"

export const DashboardEarnRoutes: FC = () => {
  return (
    <PortfolioContainer>
      <DashboardLayout sidebar="accounts">
        <EarnAssetsStateProvider>
          <Routes>
            <Route path="" element={<DashboardEarnPage />} />
            <Route path="yield/:yieldId" element={<DashboardYieldPositionPage />} />
          </Routes>
        </EarnAssetsStateProvider>
      </DashboardLayout>
    </PortfolioContainer>
  )
}
