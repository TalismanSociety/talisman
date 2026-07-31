import { isBittensorNetworkId } from "@core/domains/bittensor/exports"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import type { FC } from "react"

import { BittensorUnbondingPeriod } from "../Bittensor/BittensorBondModal/BittensorUnbondingPeriod"
import { NomPoolUnbondingPeriod } from "../NominationPools/NomPoolUnbondingPeriod"

export const StakingUnbondingPeriod: FC<{ chainId: DotNetworkId | null | undefined }> = ({
  chainId,
}) => {
  if (isBittensorNetworkId(chainId)) return <BittensorUnbondingPeriod />
  return <NomPoolUnbondingPeriod chainId={chainId} />
}
