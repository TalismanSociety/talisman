import { AccountAddDcentDisabledMessage } from "@ui/domains/Account/AccountAdd/AccountAddDcent"

import { DashboardMainLayout } from "../../layout"

export const AccountAddDcentDashboardWizard = () => {
  return (
    <DashboardMainLayout sidebar="settings" width="660">
      <AccountAddDcentDisabledMessage />
    </DashboardMainLayout>
  )
}
