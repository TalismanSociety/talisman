import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { AccountAddressType } from "@extension/core"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AccountAddDerivedForm } from "@ui/domains/Account/AccountAdd/AccountAddDerived/AccountAddDerivedForm"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

const Content = () => {
  const { t } = useTranslation("admin")
  // get type paramter from url
  const [params] = useSearchParams()
  const urlParamType = (params.get("type") ?? undefined) as AccountAddressType | undefined
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  const accountTypeString = () => {
    switch (urlParamType) {
      case "ethereum":
        return " Ethereum"
      case "sr25519":
        return " Polkadot"
      default:
        return ""
    }
  }

  return (
    <>
      <HeaderBlock
        title={t(`Create a new${accountTypeString()} account`)}
        text={!urlParamType && t("What type of account would you like to create?")}
      />
      <Spacer small />
      <AccountAddDerivedForm onSuccess={setAddress} />
    </>
  )
}

export const AccountAddDerivedPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
