import { lazy } from "react"

import { DashboardAdminLayout } from "@ui/apps/dashboard/layout"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

const AccountAddLedgerWizard = lazy(() => import("@ui/domains/Account/AccountAdd/AccountAddLedger"))

export const AccountAddLedgerDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <DashboardAdminLayout withBack centered>
      <AccountAddLedgerWizard onSuccess={setAddress} />
    </DashboardAdminLayout>
  )
}
