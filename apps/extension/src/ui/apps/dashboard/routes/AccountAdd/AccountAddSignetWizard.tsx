import { AccountAddSignetWizard } from "@ui/domains/Account/AccountAdd/AccountAddSignet/index"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

import { DashboardAdminLayout } from "../../layout"

export const AccountAddSignetDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <DashboardAdminLayout withBack centered>
      <AccountAddSignetWizard onSuccess={setAddress} />
    </DashboardAdminLayout>
  )
}
