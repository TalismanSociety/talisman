import { AccountAddSignetWizard } from "@ui/domains/Account/AccountAdd/AccountAddSignet/index"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

import { DashboardMainLayout } from "../../layout"

const Content = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return <AccountAddSignetWizard onSuccess={setAddress} />
}

export const AccountAddSignetDashboardWizard = () => (
  <DashboardMainLayout withBack sidebar="settings" width="660">
    <Content />
  </DashboardMainLayout>
)
