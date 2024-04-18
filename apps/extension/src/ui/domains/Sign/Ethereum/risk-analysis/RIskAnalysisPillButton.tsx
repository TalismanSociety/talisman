import {
  ShieldNotOkIcon,
  ShieldOkIcon,
  ShieldUnavailableIcon,
  ShieldUnknownIcon,
  ShieldZapIcon,
} from "@talismn/icons"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useRiskAnalysis } from "./context"

export const RiskAnalysisPillButton: FC = () => {
  const { riskAnalysis, drawer } = useRiskAnalysis()
  const { t } = useTranslation()

  const { icon, label, className, disabled } = useMemo(() => {
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
    }
  }, [t, riskAnalysis])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <PillButton
          disabled={disabled}
          size="sm"
          icon={icon}
          onClick={drawer.open}
          className={className}
        >
          {label}
        </PillButton>
      </TooltipTrigger>
      {disabled && (
        <TooltipContent>{t("Risk analysis is not available on this network")}</TooltipContent>
      )}
    </Tooltip>
  )
}
