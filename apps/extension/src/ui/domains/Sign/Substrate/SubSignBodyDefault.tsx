import { AccountPill } from "@ui/domains/Account/AccountPill"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useExtrinsic } from "@ui/hooks/useExtrinsic"
import { useTranslation } from "react-i18next"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { ViewDetails } from "../ViewDetails/ViewDetails"

export const SubSignBodyDefault = () => {
  const { t } = useTranslation("request")
  const { account, chain, payload } = usePolkadotSigningRequest()
  const { data: extrinsic } = useExtrinsic(payload)
  const { genericEvent } = useAnalytics()
  genericEvent("Default substrate signing method", {
    chain: chain?.name ?? "unknown",
    method: extrinsic ? `${extrinsic.method.section}.${extrinsic.method.method}` : "unknown",
  })

  return (
    <div className="animate-fade-in flex grow flex-col">
      <h1>{t("Approve Request")}</h1>
      <h2 className="center">
        {t("You are approving a request with account")}{" "}
        <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
        {chain ? ` on ${chain.name}` : null}
      </h2>
      <div className="mt-16">
        <ViewDetails />
      </div>
    </div>
  )
}
