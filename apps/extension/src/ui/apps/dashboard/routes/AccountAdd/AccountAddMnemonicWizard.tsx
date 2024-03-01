import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { AccountAddMnemonicWizard } from "@ui/domains/Account/AccountAdd/AccountAddMnemonic/router"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

export const AccountAddMnemonicDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <DashboardLayout withBack centered>
      <AccountAddMnemonicWizard onSuccess={setAddress} />
    </DashboardLayout>
  )
}
