import { ActionEnum } from "@blowfishxyz/api-client/v20230605"
import {
  LoaderIcon,
  ShieldNotOkIcon,
  ShieldOkIcon,
  ShieldUnavailableIcon,
  ShieldUnknownIcon,
  ShieldZapIcon,
} from "@talismn/icons"
import { log } from "extension-shared"
import { TFunction } from "i18next"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useRiskAnalysis } from "./context"

const getErrorTooltip = (t: TFunction, error: Error) => {
  log.error("Failed to analyse risks", { error })
  switch (error.name) {
    case "FetchError":
      return t("Failed to connect to risk analysis service. ")
    case "AbortError":
      return t("Risk analysis request was aborted")
    case "BlowfishBadRequestError":
      return t("Invalid request")
    default:
      return t("Failed to analyse risks: {{message}}", { message: error.message })
  }
}

export const RiskAnalysisPillButton: FC = () => {
  const riskAnalysis = useRiskAnalysis()
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
    if (riskAnalysis?.result?.action === ActionEnum.None)
      return {
        label: t("Low Risk"),
        icon: ShieldOkIcon,
        className: "text-alert-success",
        disabled: false,
      }
    if (riskAnalysis?.result?.action === ActionEnum.Warn)
      return {
        label: t("Medium Risk"),
        icon: ShieldZapIcon,
        className: "text-alert-warn",
        disabled: false,
      }
    if (riskAnalysis?.result?.action === ActionEnum.Block)
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
      const error = riskAnalysis?.error as Error

      // Consider it's worth retrying in case of api error (429, 500..) unless it's because of an invalid request
      // Add conditions here as we discover them
      const isInvalidRequest = error?.message === "Unsupported message type. Proceed with caution"

      return {
        icon: ShieldUnavailableIcon,
        label: isInvalidRequest ? t("Assessment unavailable") : t("Scan failed"),
        className: "opacity-50",
        disabled: isInvalidRequest, // let user retry if he wants, unless it's an invalid request
        tooltip: getErrorTooltip(t, riskAnalysis.error as Error),
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
