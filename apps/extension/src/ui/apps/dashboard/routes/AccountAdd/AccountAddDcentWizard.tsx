import { AccountAddDcentDisabledMessage } from "@ui/domains/Account/AccountAdd/AccountAddDcent"

import { DashboardLayout } from "../../layout"

export const AccountAddDcentDashboardWizard = () => {
  return (
    <DashboardLayout sidebar="settings" width="660">
      <AccountAddDcentDisabledMessage />
    </DashboardLayout>
  )
}
