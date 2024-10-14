import { lazy } from "react"

import { DashboardMainLayout } from "@ui/apps/dashboard/layout"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

const AccountAddLedgerWizard = lazy(() => import("@ui/domains/Account/AccountAdd/AccountAddLedger"))

const Content = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return <AccountAddLedgerWizard onSuccess={setAddress} />
}

export const AccountAddLedgerDashboardWizard = () => (
  <DashboardMainLayout sidebar="settings" width="660">
    <Content />
  </DashboardMainLayout>
)
