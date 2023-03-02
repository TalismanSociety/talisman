import { WithTooltip } from "@talisman/components/Tooltip"
import { InfoIcon } from "@talisman/theme/icons"
import { ethers } from "ethers"

import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { useSendFunds } from "./useSendFunds"

export const SendFundsFeeTooltip = () => {
  const { feeToken, feeTokenBalance, estimatedFee, evmTransaction } = useSendFunds()
  if (!feeToken || !feeTokenBalance || !estimatedFee) return null

  return (
    <WithTooltip
      className="ml-1"
      tooltip={
        <div className="grid grid-cols-2 gap-2">
          <div>Estimated fee:</div>
          <div className="text-right">
            <TokensAndFiat planck={estimatedFee.planck} tokenId={feeToken.id} noCountUp />
          </div>
          {!!evmTransaction?.txDetails?.maxFee && (
            <>
              <div>Max. fee:</div>
              <div className="text-right">
                <TokensAndFiat
                  planck={ethers.BigNumber.from(evmTransaction.txDetails.maxFee).toBigInt()}
                  tokenId={feeToken.id}
                  noCountUp
                />
              </div>
            </>
          )}
          <div>Balance:</div>
          <div className="text-right">
            <TokensAndFiat
              planck={feeTokenBalance.transferable.planck}
              tokenId={feeToken.id}
              noCountUp
            />
          </div>
        </div>
      }
    >
      <InfoIcon className="inline align-text-top text-sm" />
    </WithTooltip>
  )
}
