import { NetworkId } from "@talismn/chaindata-provider"
import { FC } from "react"

import { ChainLogo } from "@ui/domains/Asset/ChainLogo"

// TODO yeet
export const NetworkLogo: FC<{
  networkId?: NetworkId
  className?: string
}> = ({ className, networkId: networkId }) => <ChainLogo className={className} id={networkId} />
