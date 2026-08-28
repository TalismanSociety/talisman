import {
  LoaderIcon,
  ShieldNotOkIcon,
  ShieldOkIcon,
  ShieldUnavailableIcon,
  ShieldUnknownIcon,
  ShieldZapIcon,
} from "@talismn/icons"
import { PillButton, type PillButtonSize } from "@ui/components/PillButton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useOptionalRiskAnalysis } from "./context"

export const useShowRiskAnalysisPillButton = () => {
  const isEnabled = useFeatureFlag("RISK_ANALYSIS_V2")
  const riskAnalysis = useOptionalRiskAnalysis()

  return isEnabled && !!riskAnalysis
}

export const RiskAnalysisRow: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const showRiskAnalysis = useShowRiskAnalysisPillButton()

  if (!showRiskAnalysis) return null

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-8 text-body-secondary text-sm",
        className
      )}
    >
      <div>{t("Risk Assessment")}</div>
      <RiskAnalysisPillButton className="h-12" size="xs" />
    </div>
  )
}

export const RiskAnalysisPillButton: FC<{ className?: string; size?: PillButtonSize }> = ({
  className: classNameProp,
  size = "sm",
}) => {
  const isEnabled = useFeatureFlag("RISK_ANALYSIS_V2")
  const riskAnalysis = useOptionalRiskAnalysis()
  const { t } = useTranslation()

  const { icon, label, className, disabled, tooltip } = useMemo(() => {
    if (riskAnalysis?.scanError) {
      return {
        icon: ShieldUnavailableIcon,
        label: t("Assessment Unavailable"),
        className: "opacity-50",
        disabled: false,
      }
    }
    if (riskAnalysis?.validationResult === "Benign")
      return {
        label: t("Low Risk"),
        icon: ShieldOkIcon,
        className: "text-alert-success",
        disabled: false,
      }
    if (riskAnalysis?.validationResult === "Warning")
      return {
        label: t("Medium Risk"),
        icon: ShieldZapIcon,
        className: "text-alert-warn",
        disabled: false,
      }
    if (riskAnalysis?.validationResult === "Malicious")
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

    if (riskAnalysis?.error) {
      const error = riskAnalysis.error as Error

      // Consider it's worth retrying in case of api error (429, 500..) unless it's because of an invalid request
      // Add conditions here as we discover them
      const isInvalidRequest = error?.message === "Unsupported message type. Proceed with caution"

      return {
        icon: ShieldUnavailableIcon,
        label: isInvalidRequest ? t("Assessment unavailable") : t("Scan failed"),
        className: "opacity-50",
        disabled: isInvalidRequest, // let user retry if he wants, unless it's an invalid request
        tooltip: error.message,
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
      tooltip: riskAnalysis?.unavailableReason,
    }
  }, [t, riskAnalysis])

  const handleClick = useCallback(() => {
    if (!riskAnalysis || riskAnalysis.isValidating) return

    if (riskAnalysis.result) riskAnalysis.review.drawer.open()
    else riskAnalysis.launchScan()
  }, [riskAnalysis])

  if (!isEnabled) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <PillButton
          disabled={disabled}
          size={size}
          icon={icon}
          onClick={handleClick}
          className={cn(className, classNameProp)}
        >
          {label}
        </PillButton>
      </TooltipTrigger>
      {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
    </Tooltip>
  )
}
