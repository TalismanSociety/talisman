import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import {
  BITTENSOR_NETWORK_ID,
  BITTENSOR_TESTNET_NETWORK_ID,
  sortBittensorNetworkIds,
  useBittensorNetworkIds,
} from "@ui/state/bittensor"
import { cn } from "@ui/util/cn"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useTaoDashboardNetwork } from "./TaoDashboardNetworkProvider"
import { getTaoDashboardUrl } from "./util"

/** Mainnet/Testnet switch, only shown when more than one bittensor network is active */
export const TaoDashboardNetworkTabs: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const { networkId } = useTaoDashboardNetwork()
  const bittensorNetworkIds = useBittensorNetworkIds()
  const navigate = useNavigateWithQuery()

  const tabs = useMemo(
    () =>
      sortBittensorNetworkIds(bittensorNetworkIds).map((id) => ({
        value: id,
        label:
          id === BITTENSOR_NETWORK_ID
            ? t("Mainnet")
            : id === BITTENSOR_TESTNET_NETWORK_ID
              ? t("Testnet")
              : t("Devnet"),
      })),
    [bittensorNetworkIds, t]
  )

  if (bittensorNetworkIds.length < 2) return null

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-6.5 max-w-full items-center gap-1 overflow-hidden rounded-xs bg-grey-850 p-1 font-bold text-sm",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={networkId === tab.value}
          className={cn(
            "relative h-full rounded-sm px-3 font-bold text-body",
            networkId === tab.value ? "bg-grey-700" : "hover:bg-grey-750"
          )}
          onClick={() => tab.value !== networkId && navigate(getTaoDashboardUrl(tab.value))}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
