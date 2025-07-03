import { DotNetworkId } from "@talismn/chaindata-provider"
import { FC } from "react"

import { BittensorUnbondingPeriod } from "../Bittensor/BittensorBondModal/BittensorUnbondingPeriod"
import { NomPoolUnbondingPeriod } from "../NominationPools/NomPoolUnbondingPeriod"

export const StakingUnbondingPeriod: FC<{ chainId: DotNetworkId | null | undefined }> = ({
  chainId,
}) => {
  switch (chainId) {
    case "bittensor":
      return <BittensorUnbondingPeriod />
    default:
      return <NomPoolUnbondingPeriod chainId={chainId} />
  }
}
