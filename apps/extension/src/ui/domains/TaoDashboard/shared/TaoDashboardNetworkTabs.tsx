import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { BITTENSOR_NETWORK_ID, useBittensorNetworkIds } from "@ui/state/bittensor"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { type NavTabConfig, TaoDashboardNavTabs } from "./TaoDashboardNavTabs"
import { useTaoDashboardNetwork } from "./TaoDashboardNetworkProvider"
import { getTaoDashboardUrl } from "./util"

/** Mainnet/Testnet switch, only shown when more than one bittensor network is active */
export const TaoDashboardNetworkTabs: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const { networkId } = useTaoDashboardNetwork()
  const bittensorNetworkIds = useBittensorNetworkIds()
  const navigate = useNavigateWithQuery()

  const tabs = useMemo<NavTabConfig<string>[]>(
    () =>
      [...bittensorNetworkIds]
        .sort((a, b) => Number(b === BITTENSOR_NETWORK_ID) - Number(a === BITTENSOR_NETWORK_ID))
        .map((id) => ({
          value: id,
          label: id === BITTENSOR_NETWORK_ID ? t("Mainnet") : t("Testnet"),
        })),
    [bittensorNetworkIds, t]
  )

  if (bittensorNetworkIds.length < 2) return null

  return (
    <TaoDashboardNavTabs
      tabs={tabs}
      selected={networkId}
      onSelect={(id) => id !== networkId && navigate(getTaoDashboardUrl(id))}
      className={className}
    />
  )
}
