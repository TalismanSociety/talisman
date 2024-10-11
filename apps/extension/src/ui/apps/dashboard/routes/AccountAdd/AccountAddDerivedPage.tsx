import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { AccountAddressType } from "@extension/core"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { AccountAddDerivedForm } from "@ui/domains/Account/AccountAdd/AccountAddDerived/AccountAddDerivedForm"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

import { DashboardMainLayout } from "../../layout"

const Content = () => {
  const { t } = useTranslation("admin")
  // get type paramter from url
  const [params] = useSearchParams()
  const urlParamType = (params.get("type") ?? undefined) as AccountAddressType | undefined
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <>
      <HeaderBlock
        title={t("Create a new account")}
        text={!urlParamType && t("What type of account would you like to create?")}
      />
      <Spacer small />
      <AccountAddDerivedForm onSuccess={setAddress} />
    </>
  )
}

export const AccountAddDerivedPage = () => (
  <DashboardMainLayout withBack sidebar="settings" width="660">
    <Content />
  </DashboardMainLayout>
)
