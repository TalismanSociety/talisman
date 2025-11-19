import { NetworkId } from "@talismn/chaindata-provider"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { useNetworkById } from "@ui/state"

export const TxHistoryDetailsNetwork: FC<{
  networkId: NetworkId
}> = ({ networkId }) => {
  const { t } = useTranslation()
  const network = useNetworkById(networkId)

  if (!network) return t("{{networkId}} (Unknown Network)", { networkId })

  return (
    <div className="flex w-full gap-2 overflow-hidden">
      <NetworkLogo networkId={networkId} className="shrink-0" />
      <NetworkName networkId={networkId} className="grow" />
    </div>
  )
}
