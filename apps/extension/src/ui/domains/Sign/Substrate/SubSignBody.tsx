import { Chain } from "extension-core"
import { FC, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { AccountPill } from "@ui/domains/Account/AccountPill"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { ViewDetailsSub } from "../ViewDetails/ViewDetailsSub"
import { SubSignDecoded } from "./decode/SubSignDecoded"
import { isBatchCall } from "./types"

export const SubSignBody: FC = () => {
  const { t } = useTranslation()
  const { account, chain, decodedCall } = usePolkadotSigningRequest()

  const isBatch = useMemo(() => isBatchCall(decodedCall), [decodedCall])

  return (
    <div className="animate-fade-in flex grow flex-col">
      <h1 className="text-md text-body my-12 font-bold">
        {isBatch ? t("Approve Batch Request") : t("Approve Request")}
      </h1>
      <h2 className="text-base leading-[3.2rem]">
        <Trans
          t={t}
          components={{
            RequestType: <>{isBatch ? t("batch request") : t("request")}</>,
            Account: <AccountPill account={account} prefix={chain?.prefix ?? undefined} />,
            Extra: <ChainLabel chain={chain} />,
          }}
          defaults="You are approving a <RequestType /> with account <Account /><Extra />"
        />
      </h2>
      <div className="my-16 flex justify-center">
        <ViewDetailsSub />
      </div>
      <SubSignDecoded />
    </div>
  )
}

const ChainLabel = ({ chain }: { chain: Chain | null }) => {
  const { t } = useTranslation()

  if (!chain) return null

  return (
    <Trans
      t={t}
      components={{
        ChainName: <ChainName chain={chain} />,
      }}
      defaults="on <ChainName />"
    ></Trans>
  )
}

const ChainName = ({ chain }: { chain: Chain }) => {
  return (
    <span className="text-body inline-flex max-w-full items-baseline gap-[0.3em]">
      <span>
        <ChainLogo id={chain.id} className="inline-block shrink-0 align-middle text-[1.4em]" />
      </span>
      <span className="truncate">{chain.name}</span>
    </span>
  )
}
