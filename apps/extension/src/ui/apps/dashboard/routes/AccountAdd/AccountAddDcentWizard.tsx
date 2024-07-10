import { AccountAddDcentDisabledMessage } from "@ui/domains/Account/AccountAdd/AccountAddDcent"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const AccountAddDcentDashboardWizard = () => {
  return (
    <DashboardLayout withBack centered>
      <AccountAddDcentDisabledMessage />
    </DashboardLayout>
  )
}
