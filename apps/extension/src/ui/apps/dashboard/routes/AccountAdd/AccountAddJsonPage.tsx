import { useTranslation } from "react-i18next"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { AccountAddJson } from "@ui/domains/Account/AccountAdd/AccountAddJson"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

import { DashboardLayout } from "../../layout"

const Content = () => {
  const { t } = useTranslation("admin")
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <>
      <HeaderBlock
        title={t("Import JSON")}
        text={t("Please choose the .json file you exported from Polkadot.js or Talisman")}
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
