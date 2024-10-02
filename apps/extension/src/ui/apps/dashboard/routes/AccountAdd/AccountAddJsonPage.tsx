import { useTranslation } from "react-i18next"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { AccountAddJson } from "@ui/domains/Account/AccountAdd/AccountAddJson"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

import { DashboardAdminLayout } from "../../layout/Admin/DashboardAdminLayout"

export const AccountAddJsonPage = () => {
  const { t } = useTranslation("admin")
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <DashboardAdminLayout withBack centered>
      <HeaderBlock
        title={t("Import JSON")}
        text={t("Please choose the .json file you exported from Polkadot.js or Talisman")}
      />
      <Spacer />
      <AccountAddJson onSuccess={setAddress} />
    </DashboardAdminLayout>
  )
}
