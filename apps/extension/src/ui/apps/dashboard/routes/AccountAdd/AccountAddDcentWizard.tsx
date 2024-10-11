import { AccountAddDcentDisabledMessage } from "@ui/domains/Account/AccountAdd/AccountAddDcent"

import { DashboardMainLayout } from "../../layout"

export const AccountAddDcentDashboardWizard = () => {
  return (
    <DashboardMainLayout withBack sidebar="settings" width="660">
      <AccountAddDcentDisabledMessage />
    </DashboardMainLayout>
  )
}
