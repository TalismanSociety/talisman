import { InfoIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import type { FC, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import type { BittensorYieldRateType } from "../utils/yieldRateType"

export const useBittensorYieldRateText = (rateType: BittensorYieldRateType) => {
  const { t } = useTranslation()

  const texts: Record<BittensorYieldRateType, { label: string; description: string }> = {
    APR: {
      label: t("APR"),
      description: t("Last 30 days of validator rewards, annualized. Not compounded."),
    },
    APY: {
      label: t("APY"),
      description: t("Last 30 days of validator rewards, annualized. Compounded."),
    },
  }

  return texts[rateType]
}

export const BittensorYieldRateTooltip: FC<{
  rateType: BittensorYieldRateType
  children: ReactNode
}> = ({ rateType, children }) => {
  const { description } = useBittensorYieldRateText(rateType)

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  )
}

export const BittensorYieldRateLabel: FC<{
  rateType: BittensorYieldRateType
  children?: ReactNode
}> = ({ rateType, children }) => {
  const { label } = useBittensorYieldRateText(rateType)

  return (
    <BittensorYieldRateTooltip rateType={rateType}>
      <div className="flex items-center gap-1">
        {children ?? label}
        <InfoIcon />
      </div>
    </BittensorYieldRateTooltip>
  )
}
