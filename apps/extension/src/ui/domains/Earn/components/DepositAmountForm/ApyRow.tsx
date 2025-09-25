import { InfoIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useDepositFunds } from "../useDepositFunds"

export const ApyRow = () => {
  const { t } = useTranslation()
  const { product } = useDepositFunds()

  if (!product) return null

  const { rewardRate, mechanics } = product
  const apy = rewardRate.total * 100 // Convert decimal to percentage

  // Calculate fee information
  const grossRewardRate = rewardRate.total * 100
  const performanceFee = mechanics.possibleFeeTakingMechanisms.performanceFee ? "Yes" : "No"
  const additionalRewards = rewardRate.components.length > 1 ? "Yes" : "No"

  return (
    <div className="flex w-full items-center justify-between">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-grey-400 flex items-center gap-1 whitespace-nowrap leading-none">
            {t("APY")}
            <InfoIcon />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="w-96 space-y-2 text-xs">
            <div className="flex justify-between">
              <span>{t("Gross Reward Rate")}</span>
              <span className="text-[0.75rem] font-semibold text-white">
                {grossRewardRate.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t("Performance Fees")}</span>
              <span className="text-[0.75rem] font-semibold text-white">{performanceFee}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("Additional Rewards")}</span>
              <span className="text-[0.75rem] font-semibold text-white">{additionalRewards}</span>
            </div>
            <div className="border-grey-700 border-t pt-2">
              {t(
                "All reward amounts displayed in this app are the amounts after fees, please note that the reward rate is not guaranteed and may change over time",
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
      <div>{apy.toFixed(2)}%</div>
    </div>
  )
}
