import { FC } from "react"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { ProductionSelectionPage } from "./EarnPage"

export const EarnRoutes: FC = () => {
  return (
    <DashboardLayout sidebar="accounts">
      <ProductionSelectionPage />
    </DashboardLayout>
  )
}
