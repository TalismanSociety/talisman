import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { HeaderBlock } from "@ui/components/HeaderBlock"
import { Spacer } from "@ui/components/Spacer"
import { AccountAddJson } from "@ui/domains/Account/AccountAdd/AccountAddJson"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useTranslation } from "react-i18next"

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
