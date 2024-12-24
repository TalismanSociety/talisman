import { AccountAddSignetWizard } from "@ui/domains/Account/AccountAdd/AccountAddSignet/index"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

import { DashboardLayout } from "../../layout"

const Content = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return <AccountAddSignetWizard onSuccess={setAddress} />
}

export const AccountAddSignetDashboardWizard = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
