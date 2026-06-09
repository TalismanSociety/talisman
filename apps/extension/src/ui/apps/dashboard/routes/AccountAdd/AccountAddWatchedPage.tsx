import type { AccountPlatform } from "@talismn/crypto"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { HeaderBlock } from "@ui/components/HeaderBlock"
import { Spacer } from "@ui/components/Spacer"
import { AccountAddWatchedForm } from "@ui/domains/Account/AccountAdd/AccountAddWatchedForm"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { capitalize } from "lodash-es"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

const Content = () => {
  const { t } = useTranslation()
  // get type paramter from url
  const [params] = useSearchParams()
  const urlParamPlatform = (params.get("platform") ?? undefined) as AccountPlatform | undefined
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  const accountTypeString = useMemo(() => {
    if (urlParamPlatform === "polkadot") return "Substrate"
    return urlParamPlatform ? capitalize(urlParamPlatform) : ""
  }, [urlParamPlatform])

  return (
    <>
      <HeaderBlock
        title={t(`Add a watched {{type}} account`, { type: accountTypeString })}
        text={!urlParamPlatform && t("What type of account would you like to create?")}
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
