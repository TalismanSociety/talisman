import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AccountAddQrWizard } from "@ui/domains/Account/AccountAdd/AccountAddQr"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

const Content = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return <AccountAddQrWizard onSuccess={setAddress} />
}

export const AccountAddQrDashboardWizard = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
