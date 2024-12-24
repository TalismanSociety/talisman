import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { AccountAddressType } from "@extension/core"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AccountAddWatchedForm } from "@ui/domains/Account/AccountAdd/AccountAddWatchedForm"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

export const Content = () => {
  const { t } = useTranslation("admin")
  // get type paramter from url
  const [params] = useSearchParams()
  const urlParamType = (params.get("type") ?? undefined) as AccountAddressType | undefined
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <>
      <HeaderBlock
        title={t("Add a watched account")}
        text={!urlParamType && t("What type of account would you like to create?")}
      />
      <Spacer small />
      <AccountAddWatchedForm onSuccess={setAddress} />
    </>
  )
}

export const AccountAddWatchedPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
