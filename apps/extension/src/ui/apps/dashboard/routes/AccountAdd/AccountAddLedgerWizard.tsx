import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { lazy } from "react"

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
