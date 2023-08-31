import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { AccountAddQrWizard } from "@ui/domains/Account/AccountAdd/AccountAddQr"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

export const AccountAddQrDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <DashboardLayout withBack centered>
      <AccountAddQrWizard onSuccess={setAddress} />
    </DashboardLayout>
  )
}
