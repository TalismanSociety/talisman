import { NetworkId } from "@talismn/chaindata-provider"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useNetworkById } from "@ui/state"

export const SummaryNetworkDisplay: FC<{ networkId: NetworkId }> = ({ networkId }) => {
  const { t } = useTranslation()
  const network = useNetworkById(networkId)

  return (
    <span className="text-body truncate whitespace-nowrap">
      <ChainLogo id={networkId} className="inline-block size-[1.2em] align-sub" />
      <span className="ml-[0.3em] truncate">{network?.name ?? t("Unknown network")}</span>
    </span>
  )
}
