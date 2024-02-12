import { AccountAddSignetWizard } from "@ui/domains/Account/AccountAdd/AccountAddSignet/index"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const AccountAddSignetDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <DashboardLayout withBack centered>
      <AccountAddSignetWizard onSuccess={setAddress} />
    </DashboardLayout>
  )
}
