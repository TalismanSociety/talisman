import type { NetworkId } from "@talismn/chaindata-provider"
import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import { TaoDashboardNetworkProvider } from "@ui/domains/TaoDashboard/shared/TaoDashboardNetworkProvider"
import type { FC } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { DashboardLayout } from "../../layout"
import { TaoDashboardSubnetPage } from "./TaoDashboardSubnetPage"
import { TaoDashboardSubnetsPage } from "./TaoDashboardSubnetsPage"

export const TaoDashboardRoutes: FC<{ networkId: NetworkId }> = ({ networkId }) => {
  return (
    <TaoDashboardNetworkProvider networkId={networkId}>
      <PortfolioContainer>
        <Routes>
          <Route
            path="subnets/:netuid"
            element={
              <DashboardLayout sidebar="none" className="min-w-325">
                <TaoDashboardSubnetPage />
              </DashboardLayout>
            }
          />
          <Route
            path="subnets"
            element={
              <DashboardLayout sidebar="accounts" className="min-w-325">
                <TaoDashboardSubnetsPage />
              </DashboardLayout>
            }
          />
          <Route index element={<Navigate to="subnets" replace />} />
          <Route path="*" element={<Navigate to="subnets" replace />} />
        </Routes>
      </PortfolioContainer>
    </TaoDashboardNetworkProvider>
  )
}
