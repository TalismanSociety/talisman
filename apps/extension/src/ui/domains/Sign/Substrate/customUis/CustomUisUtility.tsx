import { useTranslation } from "react-i18next"

import { AccountPill } from "@ui/domains/Account/AccountPill"

import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { ViewDetailsSub } from "../../ViewDetails/ViewDetailsSub"
import { SubSignDecoded } from "../decode/SubSignDecoded"
import { DecodedBatchArgs, DecodedCallComponent, DecodedCallComponentDefs } from "../types"

const Batch: DecodedCallComponent<DecodedBatchArgs> = () => {
  const { t } = useTranslation("request")
  const { account, chain } = usePolkadotSigningRequest()

  return (
    <div className="animate-fade-in flex grow flex-col">
      <h1 className="text-md text-body my-12 font-bold">{t("Approve Batch Request")}</h1>
      <h2 className="text-base leading-[3.2rem]">
        {t("You are approving a batch request with account")}{" "}
        <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
        {chain ? ` on ${chain.name}` : null}
      </h2>
      <div className="my-16 flex justify-center">
        <ViewDetailsSub />
      </div>
      <SubSignDecoded />
    </div>
  )
}

export const CUSTOM_UI_UTILITY: DecodedCallComponentDefs = [
  ["Utility", "batch", Batch],
  ["Utility", "batch_all", Batch],
  ["Utility", "force_batch", Batch],
]
