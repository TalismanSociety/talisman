import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { lazy } from "react"

const AccountAddMnemonicWizard = lazy(
  () => import("@ui/domains/Account/AccountAdd/AccountAddMnemonic/router")
)

export const AccountAddMnemonicDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <DashboardLayout withBack centered>
      <AccountAddMnemonicWizard onSuccess={setAddress} />
    </DashboardLayout>
  )
}
