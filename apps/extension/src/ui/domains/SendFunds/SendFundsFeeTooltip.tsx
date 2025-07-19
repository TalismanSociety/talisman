import { InfoIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"

import { WithTooltip } from "@talisman/components/Tooltip"

import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { useSendFunds } from "./useSendFunds"

export const SendFundsFeeTooltip = () => {
  const { t } = useTranslation()
  const { feeToken, feeTokenBalance, estimatedFee, transaction } = useSendFunds()
  if (!feeToken || !feeTokenBalance || !estimatedFee) return null

  return (
    <WithTooltip
      className="ml-1"
      tooltip={
        <div className="grid grid-cols-2 gap-2">
          <div>{t("Estimated fee:")}</div>
          <div className="text-right">
            <TokensAndFiat planck={estimatedFee.planck} tokenId={feeToken.id} noCountUp />
          </div>
          {transaction?.platform === "ethereum" && !!transaction.txDetails?.maxFee && (
            <>
              <div>{t("Max. fee:")}</div>
              <div className="text-right">
                <TokensAndFiat
                  planck={transaction.txDetails.maxFee}
                  tokenId={feeToken.id}
                  noCountUp
                />
              </div>
            </>
          )}
          <div>{t("Balance:")}</div>
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
