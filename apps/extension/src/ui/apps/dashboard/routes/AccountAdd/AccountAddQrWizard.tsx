import { DashboardAdminLayout } from "@ui/apps/dashboard/layout/DashboardAdminLayout"
import { AccountAddQrWizard } from "@ui/domains/Account/AccountAdd/AccountAddQr"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

export const AccountAddQrDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <DashboardAdminLayout withBack centered>
      <AccountAddQrWizard onSuccess={setAddress} />
    </DashboardAdminLayout>
  )
}
