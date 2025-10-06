import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, ButtonProps, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useRiskAnalysis } from "./risk-analysis/context"

export const SignApproveButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation()
  const riskAnalysis = useRiskAnalysis()

  const color = useMemo(() => {
    switch (riskAnalysis?.validationResult) {
      case "Malicious":
        return "red"
      case "Warning":
        return "orange"
      default:
        return "primary"
    }
  }, [riskAnalysis?.validationResult])

  const [disabled, tooltip] = useMemo(() => {
    try {
      if (!riskAnalysis || props.disabled) return [!!props.disabled, null]

      if (
        riskAnalysis.review.isRiskAcknowledgementRequired &&
        !riskAnalysis.review.isRiskAcknowledged
      )
        return [true, t("You must acknowledge the risks before signing")]

      if (riskAnalysis.isValidating) return [true, null]
    } catch (err) {
      // This will crash if the button is not in a RiskAnalysisProvider container, resulting in riskAnalysis being an empty object
      // this is the case for substrate transactions
      // ignore until we implement a system in provideContext that allows fallback if a consumer is not in a provider
    }

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
