import { lazy } from "react"

import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

const AccountAddMnemonicWizard = lazy(
  () => import("@ui/domains/Account/AccountAdd/AccountAddMnemonic/router"),
)

const Content = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return <AccountAddMnemonicWizard onSuccess={setAddress} />
}

export const AccountAddMnemonicDashboardWizard = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
