import { FC } from "react"

import { useNomPoolBondWizard } from "./NomPoolBond/useNomPoolBondWizard"
import { StakingFeeEstimate } from "./StakingFeeEstimate"

export const InlineStakingFeeEstimate: FC<{ noCountUp?: boolean }> = ({ noCountUp }) => {
  const { feeEstimate, feeToken, isLoadingFeeEstimate, errorFeeEstimate } = useNomPoolBondWizard()

  return (
    <StakingFeeEstimate
      plancks={feeEstimate}
      tokenId={feeToken?.id}
      isLoading={isLoadingFeeEstimate}
      error={errorFeeEstimate}
      noCountUp={noCountUp}
    />
  )
}
