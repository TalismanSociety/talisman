import { ActionEnum } from "@blowfishxyz/api-client/v20230605"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, ButtonProps, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useRiskAnalysis } from "./Ethereum/riskAnalysis"

export const SignApproveButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("request")
  const riskAnalysis = useRiskAnalysis()

  const color = useMemo(() => {
    switch (riskAnalysis?.result?.action) {
      case ActionEnum.Block:
        return "red"
      case ActionEnum.Warn:
        return "orange"
      default:
        return "primary"
    }
  }, [riskAnalysis?.result?.action])

  const [disabled, tooltip] = useMemo(() => {
    if (!riskAnalysis || props.disabled) return [!!props.disabled, null]

    if (riskAnalysis.review.isRiskAknowledgementRequired && !riskAnalysis.review.isRiskAknowledged)
      return [true, t("You must acknowledge the risks before signing")]

    if (riskAnalysis.isValidating) return [true, null]

    return [false, null]
  }, [props.disabled, riskAnalysis, t])

  if (tooltip) {
    return (
      <Tooltip placement="top-end">
        <TooltipTrigger asChild>
          <div>
            <Button {...props} disabled={disabled} color={color} fullWidth />
          </div>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    )
  }

  return <Button {...props} disabled={disabled} color={color} />
}
