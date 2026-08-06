import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import {
  BITTENSOR_NETWORK_ID,
  BITTENSOR_TESTNET_NETWORK_ID,
  sortBittensorNetworkIds,
  useBittensorNetworkIds,
} from "@ui/state/bittensor"
import { useNetworkById } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { useTaoDashboardNetwork } from "./TaoDashboardNetworkProvider"
import { getTaoDashboardUrl } from "./util"

const NetworkTab: FC<{ networkId: DotNetworkId; isSelected: boolean; onClick: () => void }> = ({
  networkId,
  isSelected,
  onClick,
}) => {
  const { t } = useTranslation()
  const network = useNetworkById(networkId, "polkadot")

  // the two shipped networks get a short label, anything else (eg a devnet) uses its own name
  const label =
    networkId === BITTENSOR_NETWORK_ID
      ? t("Mainnet")
      : networkId === BITTENSOR_TESTNET_NETWORK_ID
        ? t("Testnet")
        : (network?.name ?? networkId)

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      className={cn(
        "relative h-full rounded-sm px-3 font-bold text-body",
        isSelected ? "bg-grey-700" : "hover:bg-grey-750"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

/** Mainnet/Testnet switch, only shown when more than one bittensor network is active */
export const TaoDashboardNetworkTabs: FC<{ className?: string }> = ({ className }) => {
  const { networkId } = useTaoDashboardNetwork()
  const bittensorNetworkIds = useBittensorNetworkIds()
  const navigate = useNavigateWithQuery()

  if (bittensorNetworkIds.length < 2) return null

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-6.5 max-w-full items-center gap-1 overflow-hidden rounded-xs bg-grey-850 p-1 font-bold text-sm",
        className
      )}
    >
      {sortBittensorNetworkIds(bittensorNetworkIds).map((id) => (
        <NetworkTab
          key={id}
          networkId={id}
          isSelected={networkId === id}
          onClick={() => id !== networkId && navigate(getTaoDashboardUrl(id))}
        />
      ))}
    </div>
  )
}
