import { ChainId } from "extension-core"
import { FC } from "react"

import { BittensorUnbondingPeriod } from "../Bittensor/BittensorUnbondingPeriod"
import { NomPoolUnbondingPeriod } from "../NominationPools/NomPoolUnbondingPeriod"

export const StakingUnbondingPeriod: FC<{ chainId: ChainId | null | undefined }> = ({
  chainId,
}) => {
  switch (chainId) {
    case "bittensor":
      return <BittensorUnbondingPeriod />
    default:
      return <NomPoolUnbondingPeriod chainId={chainId} />
  }
}
