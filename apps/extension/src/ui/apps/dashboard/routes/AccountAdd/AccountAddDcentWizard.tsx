import { AccountAddDcentDisabledMessage } from "@ui/domains/Account/AccountAdd/AccountAddDcent"

import { DashboardAdminLayout } from "../../layout/Admin/DashboardAdminLayout"

export const AccountAddDcentDashboardWizard = () => {
  return (
    <DashboardAdminLayout withBack centered>
      <AccountAddDcentDisabledMessage />
    </DashboardAdminLayout>
  )
}
