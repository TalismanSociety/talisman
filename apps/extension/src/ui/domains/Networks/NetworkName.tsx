import type { NetworkId } from "@talismn/chaindata-provider"
import { useNetworkDisplayName } from "@ui/state/networks"
import type { FC } from "react"

export const NetworkName: FC<{ networkId: NetworkId | null | undefined; className?: string }> = ({
  networkId,
  className,
}) => {
  const networkName = useNetworkDisplayName(networkId)

  return <span className={className}>{networkName ?? networkId}</span>
}
