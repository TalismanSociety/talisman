import { DashboardAdminLayout } from "@ui/apps/dashboard/layout"
import { AccountAddPrivateKeyForm } from "@ui/domains/Account/AccountAdd/AccountAddPrivateKeyForm"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

export const AccountAddPrivateKeyDashboardPage = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")
  return (
    <DashboardAdminLayout withBack centered>
      <AccountAddPrivateKeyForm onSuccess={setAddress} />
    </DashboardAdminLayout>
  )
}
