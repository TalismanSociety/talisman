import { NetworkId } from "@talismn/chaindata-provider"
import { FC } from "react"

import { useNetworkDisplayType } from "@ui/state/networks"

export const NetworkType: FC<{ networkId: NetworkId | null | undefined; className?: string }> = ({
  networkId,
  className,
}) => {
  const networkType = useNetworkDisplayType(networkId)

  return <span className={className}>{networkType ? networkType : "Unknown Network"}</span>
}
