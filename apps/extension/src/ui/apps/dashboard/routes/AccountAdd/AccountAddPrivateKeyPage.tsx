import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AccountAddPrivateKeyForm } from "@ui/domains/Account/AccountAdd/AccountAddPrivateKeyForm"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

const Content = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")
  return <AccountAddPrivateKeyForm onSuccess={setAddress} />
}

export const AccountAddPrivateKeyDashboardPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
