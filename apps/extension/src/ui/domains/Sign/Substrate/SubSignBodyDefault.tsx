import { AccountPill } from "@ui/domains/Account/AccountPill"
import { useTranslation } from "react-i18next"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { ViewDetails } from "../ViewDetails/ViewDetails"

export const SubSignBodyDefault = () => {
  const { t } = useTranslation("sign")
  const { account, chain } = usePolkadotSigningRequest()

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
