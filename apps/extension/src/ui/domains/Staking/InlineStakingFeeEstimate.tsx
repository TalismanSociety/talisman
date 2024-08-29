import { FC } from "react"

import { StakingFeeEstimate } from "./StakingFeeEstimate"
import { useInlineStakingWizard } from "./useInlineStakingWizard"

export const InlineStakingFeeEstimate: FC<{ noCountUp?: boolean }> = ({ noCountUp }) => {
  const { feeEstimate, feeToken, isLoadingFeeEstimate, errorFeeEstimate } = useInlineStakingWizard()

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
