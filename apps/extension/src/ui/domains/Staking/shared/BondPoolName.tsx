import { ChainId } from "extension-core"

import { BittensorDelegatorNameButton } from "../Bittensor/BittensorDelegatorNameButton"
import { NominationPoolName } from "../NominationPools/NominationPoolName"

export const BondPoolName = ({
  poolId,
  chainId,
}: {
  poolId: string | number | undefined | null
  chainId: ChainId | undefined
}) => {
  switch (chainId) {
    case "bittensor":
      return <BittensorDelegatorNameButton poolId={poolId} />
    default:
      return <NominationPoolName chainId={chainId} poolId={poolId} />
  }
}
