import { useTranslation } from "react-i18next"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { AccountCreateMenu } from "@ui/domains/Account/AccountAdd"
import { useBalancesHydrate } from "@ui/state"

import { DashboardLayout } from "../../layout"

const Content = () => {
  useBalancesHydrate() // preload
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-16">
      <HeaderBlock
        title={t("Add Account")}
        text={t("Create a new account or import an existing one")}
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
