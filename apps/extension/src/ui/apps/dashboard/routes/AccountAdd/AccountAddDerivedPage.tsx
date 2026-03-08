import type { AccountPlatform } from "@talismn/crypto"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { HeaderBlock } from "@ui/components/HeaderBlock"
import { Spacer } from "@ui/components/Spacer"
import { AccountAddDerivedForm } from "@ui/domains/Account/AccountAdd/AccountAddDerived/AccountAddDerivedForm"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { capitalize } from "lodash-es"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

const Content = () => {
  const { t } = useTranslation()
  // get type paramter from url
  const [params] = useSearchParams()
  const urlParamPlatform = (params.get("platform") ?? undefined) as AccountPlatform | undefined
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  const accountTypeString = useCallback(() => {
    if (urlParamPlatform === "polkadot") return ` ${t("Substrate")}`
    return urlParamPlatform ? ` ${capitalize(urlParamPlatform)}` : ""
  }, [urlParamPlatform, t])

  return (
    <>
      <HeaderBlock
        title={t(`Create a new${accountTypeString()} account`)}
        text={!urlParamPlatform && t("What type of account would you like to create?")}
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
