import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { AccountAddSecretWizard } from "@ui/domains/Account/AccountAdd/AccountAddMnemonic/router"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

export const AccountAddSecretDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <DashboardLayout withBack centered>
      <AccountAddSecretWizard onSuccess={setAddress} />
    </DashboardLayout>
  )
}
