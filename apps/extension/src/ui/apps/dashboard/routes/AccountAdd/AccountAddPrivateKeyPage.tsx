import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { AccountAddPrivateKeyForm } from "@ui/domains/Account/AccountAdd/AccountAddPrivateKeyForm"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

export const AccountAddPrivateKeyDashboarddWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")
  return (
    <DashboardLayout withBack centered>
      <AccountAddPrivateKeyForm onSuccess={setAddress} />
    </DashboardLayout>
  )
}
