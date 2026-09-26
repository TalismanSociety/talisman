import type { NetworkId } from "@talismn/chaindata-provider"
import { useNetworkDisplayType } from "@ui/state/networkDisplay"
import type { FC } from "react"

export const NetworkType: FC<{ networkId: NetworkId | null | undefined; className?: string }> = ({
  networkId,
  className,
}) => {
  const networkType = useNetworkDisplayType(networkId)

  return <span className={className}>{networkType ? networkType : "Unknown Network"}</span>
}
