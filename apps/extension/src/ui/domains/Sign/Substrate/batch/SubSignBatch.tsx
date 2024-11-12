import { useTranslation } from "react-i18next"

import { AccountPill } from "@ui/domains/Account/AccountPill"

import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { ViewDetailsSub } from "../../ViewDetails/ViewDetailsSub"
import { SubSignDecoded } from "../decode/SubSignDecoded"
import { SupportedCallBatch } from "../decode/types"
import { SignCallDef, SignCustomUiComponent } from "../types"

export const SupportedCallsBatch: SignCallDef[] = [
  { pallet: "Utility", call: "batch" },
  { pallet: "Utility", call: "batch_all" },
  { pallet: "Utility", call: "force_batch" },
]

export const SubSignBatch: SignCustomUiComponent<SupportedCallBatch["args"]> = () => {
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
