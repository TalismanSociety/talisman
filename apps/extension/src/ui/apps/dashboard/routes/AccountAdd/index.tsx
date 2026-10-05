import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { HeaderBlock } from "@ui/components/HeaderBlock"
import { AccountCreateMenu } from "@ui/domains/Account/AccountAdd"
import { AccountAddFlowProvider } from "@ui/domains/Account/AccountAdd/flow"
import { useBalancesHydrate } from "@ui/state/balances"
import { useTranslation } from "react-i18next"
import { Outlet } from "react-router-dom"

const Content = () => {
  useBalancesHydrate() // preload
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-16">
      <HeaderBlock
        title={t("Add Account")}
        text={t("Create a new account or import an existing account")}
      />
      <AccountCreateMenu />
    </div>
  )
}

export const AccountAddMenu = () => {
  return (
    <DashboardLayout sidebar="settings">
      <Content />
    </DashboardLayout>
  )
}

export const AccountAddLayout = () => (
  <AccountAddFlowProvider>
    <Outlet />
  </AccountAddFlowProvider>
)
