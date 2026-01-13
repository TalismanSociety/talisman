import type { NetworkId } from "@talismn/chaindata-provider"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { useNetworkById } from "@ui/state"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

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
