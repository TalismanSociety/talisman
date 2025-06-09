import { useTranslation } from "react-i18next"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AccountAddJson } from "@ui/domains/Account/AccountAdd/AccountAddJson"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

const Content = () => {
  const { t } = useTranslation()
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <>
      <HeaderBlock
        title={t("Import via JSON")}
        text={t("Please choose the json file you exported from Polkadot.js or Talisman")}
      />
      <Spacer />
      <AccountAddJson onSuccess={setAddress} />
    </>
  )
}

export const AccountAddJsonPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
