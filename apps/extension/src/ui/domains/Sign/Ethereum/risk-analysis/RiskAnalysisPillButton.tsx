import {
  LoaderIcon,
  ShieldNotOkIcon,
  ShieldOkIcon,
  ShieldUnavailableIcon,
  ShieldUnknownIcon,
  ShieldZapIcon,
} from "@talismn/icons"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useRiskAnalysis } from "./context"

export const RiskAnalysisPillButton: FC = () => {
  const riskAnalysis = useRiskAnalysis()
  const { t } = useTranslation()

  const { icon, label, className, disabled, tooltip } = useMemo(() => {
    if (riskAnalysis?.result?.action === "NONE")
      return {
        label: t("Low Risk"),
        icon: ShieldOkIcon,
        className: "text-alert-success",
        disabled: false,
      }
    if (riskAnalysis?.result?.action === "WARN")
      return {
        label: t("Medium Risk"),
        icon: ShieldZapIcon,
        className: "text-alert-warn",
        disabled: false,
      }
    if (riskAnalysis?.result?.action === "BLOCK")
      return {
        label: t("Critical Risk"),
        icon: ShieldNotOkIcon,
        className: "text-brand-orange",
        disabled: false,
      }
    if (riskAnalysis?.isValidating) {
      return {
        icon: LoaderIcon,
        label: t("Simulating"),
        className: "[&>div>svg]:animate-spin-slow",
        disabled: true,
      }
    }

    if (riskAnalysis?.isAvailable)
      return {
        icon: ShieldUnknownIcon,
        label: t("Analyse Risks"),
        className: undefined,
        disabled: false,
      }

    return {
      icon: ShieldUnavailableIcon,
      label: t("Risk Analysis"),
      className: undefined,
      disabled: true,
      tooltip: "Risk analysis is not available on this network",
    }
  }, [t, riskAnalysis])

  const handleClick = useCallback(() => {
    if (!riskAnalysis || riskAnalysis.isValidating) return

    if (riskAnalysis.result) riskAnalysis.review.drawer.open()
    else riskAnalysis.launchScan()
  }, [riskAnalysis])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <PillButton
          disabled={disabled}
          size="sm"
          icon={icon}
          onClick={handleClick}
          className={className}
        >
          {label}
        </PillButton>
      </TooltipTrigger>
      {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
    </Tooltip>
  )
}
