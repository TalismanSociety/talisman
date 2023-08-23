import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { AccountCreateMenu } from "@ui/domains/Account/AccountCreate"
import { useTranslation } from "react-i18next"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const AccountAddMenu = () => {
  const { t } = useTranslation()
  return (
    <DashboardLayout centered withBack>
      <div className="mt-64 flex flex-col gap-16">
        <HeaderBlock
          title={t("Add Account")}
          text={t("Create a new account or import an existing one")}
        />
        <AccountCreateMenu />
      </div>
    </DashboardLayout>
  )
}
