import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { lazy } from "react"

const AccountAddLedgerWizard = lazy(() => import("@ui/domains/Account/AccountAdd/AccountAddLedger"))

export const AccountAddLedgerDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <DashboardLayout withBack centered>
      <AccountAddLedgerWizard onSuccess={setAddress} />
    </DashboardLayout>
  )
}
