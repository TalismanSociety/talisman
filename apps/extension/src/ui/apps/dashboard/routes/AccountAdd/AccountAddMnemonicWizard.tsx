import { lazy } from "react"

import { DashboardAdminLayout } from "@ui/apps/dashboard/layout/DashboardAdminLayout"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

const AccountAddMnemonicWizard = lazy(
  () => import("@ui/domains/Account/AccountAdd/AccountAddMnemonic/router")
)

export const AccountAddMnemonicDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <DashboardAdminLayout withBack centered>
      <AccountAddMnemonicWizard onSuccess={setAddress} />
    </DashboardAdminLayout>
  )
}
