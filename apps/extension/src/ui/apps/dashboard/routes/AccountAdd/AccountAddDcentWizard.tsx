import { AccountAddDcentWizard } from "@ui/domains/Account/AccountAdd/AccountAddDcent"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const AccountAddDcentDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <DashboardLayout withBack centered>
      <AccountAddDcentWizard onSuccess={setAddress} />
    </DashboardLayout>
  )
}
