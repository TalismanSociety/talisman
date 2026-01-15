import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import { Navigate, Route, Routes } from "react-router-dom"

import { DashboardLayout } from "../../layout"
import { AssistantPage } from "./AssistantPage"

export const AssistantRoutes = () => {
  return (
    <PortfolioContainer>
      <DashboardLayout sidebar="accounts">
        <Routes>
          <Route index element={<AssistantPage />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </DashboardLayout>
    </PortfolioContainer>
  )
}
