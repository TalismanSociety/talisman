import { InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { STAKING_APR_UNAVAILABLE } from "../../../helpers"
import { useCombinedBittensorValidatorsData } from "../../../hooks/bittensor/useCombinedBittensorValidatorsData"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorBondFormBase } from "../BittensorBondFormBase"

const StakeAprBase: FC<{
  apr: number
  isLoading: boolean
  isError: boolean
  error: Error | null
}> = ({ apr, isLoading, isError, error }) => {
  const { t } = useTranslation()
  const display = useMemo(() => (apr ? `${(apr * 100).toFixed(2)}%` : "N/A"), [apr])

  if (isLoading)
    return <div className="text-grey-700 bg-grey-700 rounded-xs animate-pulse">15.00%</div>

  if (isError) {
    if (error?.message === STAKING_APR_UNAVAILABLE) return t("APR Unavailable")

    return <div className="text-alert-warn">{t("Unable to fetch APR data")}</div>
  }

  return (
    <span className={classNames(apr ? "text-alert-success" : "text-body-secondary")}>
      {display}
    </span>
  )
}

const BittensorStakeApr = () => {
  const { hotkey, netuid } = useBittensorBondWizard()
  const { combinedValidatorsData, isLoading, isError } = useCombinedBittensorValidatorsData(netuid)

  const apr = useMemo(() => {
    const validator = combinedValidatorsData.find((validator) => validator.hotkey === hotkey)
    return Number(validator?.validatorYield?.thirty_day_apy ?? 0)
  }, [combinedValidatorsData, hotkey])

  return <StakeAprBase apr={apr} isLoading={isLoading} isError={isError} error={null} />
}

export const BittensorRootBondForm = () => {
  const { t } = useTranslation()
  const { stakeDirection } = useBittensorBondWizard()

  const RootStakeDetails = () => {
    if (stakeDirection === "unbond") return null

    return (
      <div className="flex items-center justify-between gap-8">
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 whitespace-nowrap leading-none">
                {t("APY")}
                <InfoIcon />
              </div>
            </TooltipTrigger>
            <TooltipContent>{t("Estimated Annual Percentage Yield (APY)")}</TooltipContent>
          </Tooltip>
        </div>
        <div className={"overflow-hidden font-bold"}>
          <BittensorStakeApr />
        </div>
      </div>
    )
  }

  return <BittensorBondFormBase BondTypeDetails={RootStakeDetails} />
}
