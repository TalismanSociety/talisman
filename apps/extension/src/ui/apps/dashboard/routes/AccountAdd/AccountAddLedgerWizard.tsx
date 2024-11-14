import { lazy } from "react"

import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

const AccountAddLedgerWizard = lazy(() => import("@ui/domains/Account/AccountAdd/AccountAddLedger"))

const Content = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return <AccountAddLedgerWizard onSuccess={setAddress} />
}

export const AccountAddLedgerDashboardWizard = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
