import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { balancesHydrateAtom } from "@ui/atoms"
import { AccountCreateMenu } from "@ui/domains/Account/AccountAdd"
import { useAtomValue } from "jotai"
import { useTranslation } from "react-i18next"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const AccountAddMenu = () => {
  useAtomValue(balancesHydrateAtom)
  const { t } = useTranslation()
  return (
    <DashboardLayout centered withBack>
      <div className="flex flex-col gap-16">
        <HeaderBlock
          title={t("Add Account")}
          text={t("Create a new account or import an existing one")}
        />
        <AccountCreateMenu />
      </div>
    </DashboardLayout>
  )
}
