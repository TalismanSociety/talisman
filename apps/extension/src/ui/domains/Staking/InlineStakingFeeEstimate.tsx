import { classNames } from "@talismn/util"
import { FC } from "react"

import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { useInlineStakingWizard } from "./useInlineStakingWizard"

export const InlineStakingFeeEstimate: FC<{ noCountUp?: boolean }> = ({ noCountUp }) => {
  const { feeEstimate, feeToken, isLoadingFeeEstimate, errorFeeEstimate } = useInlineStakingWizard()

  return (
    <>
      {errorFeeEstimate ? (
        <div className="text-alert-error truncate">Failed to estimate fee</div>
      ) : !!feeEstimate && !!feeToken ? (
        <TokensAndFiat
          tokenId={feeToken?.id}
          planck={feeEstimate}
          tokensClassName="text-body"
          fiatClassName="text-body-secondary"
          noCountUp={noCountUp}
          className={classNames(isLoadingFeeEstimate && "animate-pulse")}
        />
      ) : isLoadingFeeEstimate ? (
        <div className="text-body-disabled bg-body-disabled rounded-xs animate-pulse">
          0.0000 TKN ($0.00)
        </div>
      ) : null}
    </>
  )
}
