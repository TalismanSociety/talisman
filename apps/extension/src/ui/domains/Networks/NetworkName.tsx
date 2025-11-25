import { NetworkId } from "@talismn/chaindata-provider"
import { FC } from "react"

import { useNetworkDisplayName } from "@ui/state/networks"

export const NetworkName: FC<{ networkId: NetworkId | null | undefined; className?: string }> = ({
  networkId,
  className,
}) => {
  const networkName = useNetworkDisplayName(networkId)

  return <span className={className}>{networkName ?? networkId}</span>
}
