import { AccountPill } from "@ui/domains/Account/AccountPill"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { ViewDetailsSub } from "../ViewDetails/ViewDetailsSub"

export const SubSignBodyDefault = () => {
  const { t } = useTranslation("request")
  const { account, chain, extrinsic } = usePolkadotSigningRequest()
  const { genericEvent } = useAnalytics()

  useEffect(() => {
    if (!chain || !extrinsic) return
    genericEvent("Default substrate signing method", {
      chain: chain.name,
      method: `${extrinsic.method.section}.${extrinsic.method.method}`,
    })
  }, [chain, extrinsic, genericEvent])

  return (
    <div className="animate-fade-in flex grow flex-col">
      <h1 className="text-md text-body my-12 font-bold">{t("Approve Request")}</h1>
      <h2 className="text-base leading-[3.2rem]">
        {t("You are approving a request with account")}{" "}
        <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
        {chain ? ` on ${chain.name}` : null}
      </h2>
      <div className="mt-16 flex justify-center">
        <ViewDetailsSub />
      </div>
    </div>
  )
}
