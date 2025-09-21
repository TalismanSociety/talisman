import { FC } from "react"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { EarnPage } from "./EarnPage"

export const EarnRoutes: FC = () => {
  return (
    <DashboardLayout sidebar="accounts">
      <EarnPage />
    </DashboardLayout>
  )
}
