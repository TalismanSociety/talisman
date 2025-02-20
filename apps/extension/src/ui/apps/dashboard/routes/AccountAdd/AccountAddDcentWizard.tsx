import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AccountAddDcentDisabledMessage } from "@ui/domains/Account/AccountAdd/AccountAddDcent"

export const AccountAddDcentDashboardWizard = () => {
  return (
    <DashboardLayout sidebar="settings">
      <AccountAddDcentDisabledMessage />
    </DashboardLayout>
  )
}
