import {
  ShieldNotOkIcon,
  ShieldOkIcon,
  ShieldUnavailableIcon,
  ShieldUnknownIcon,
  ShieldZapIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { RiskAnalysisWarnings } from "./RiskAnalysisWarnings"
import { EvmRiskAnalysis, TenderlyScannerFinding } from "./types"

const useRecommendation = ({ type, isAvailable, result, scanError }: EvmRiskAnalysis) => {
  const { t } = useTranslation()

  return useMemo(() => {
    if (scanError)
      return {
        Icon: ShieldUnknownIcon,
        bgClassName: "bg-grey-800",
        iconClassName: "text-body-disabled",
        title: t("An error occured"),
        description: scanError,
      }

    switch (result?.validation.actionType) {
      case "Dangerous":
        return {
          Icon: ShieldNotOkIcon,
          bgClassName: "bg-brand-orange/10",
          textClassName: "text-brand-orange",
          iconClassName: "bg-brand-orange/10",
          title: t("Critical Risk"),
          description: result.validation.actionReason ?? "",
        }
      case "Warning":
        return {
          Icon: ShieldZapIcon,
          bgClassName: "bg-alert-warn/10",
          textClassName: "text-alert-warn",
          iconClassName: "bg-alert-warn/10",
          title: t("Medium Risk"),
          description: result.validation.actionReason ?? "",
        }
      case "Safe":
        return {
          Icon: ShieldOkIcon,
          bgClassName: "bg-green/10",
          textClassName: "text-green",
          iconClassName: "bg-green/10",
          title: t("Low Risk"), // TODO say "No Risk Found" if there is none
          description:
            result.validation.actionReason ??
            (type === "transaction"
              ? t("No risks were identified in this transaction")
              : t("No risks were identified in this message")),
        }
      case "Error":
        return {
          Icon: ShieldUnknownIcon,
          bgClassName: "bg-grey-800",
          iconClassName: "text-body-disabled",
          title: t("Failed to validate"),
          description: result.validation.actionReason,
        }
    }
    if (!isAvailable) {
      return {
        Icon: ShieldUnavailableIcon,
        bgClassName: "bg-body-secondary/10",
        textClassName: "text-body-secondary",
        iconClassName: "bg-body-secondary/10",
        title: t("Unavailable"),
        description: t(
          "Risk Assessment is not supported for this network. Proceed at your own risk.",
        ),
      }
    }

    return null
  }, [isAvailable, result, scanError, t, type])
}

const RiskAnalysisRecommendationInner: FC<{
  riskAnalysis: EvmRiskAnalysis
}> = ({ riskAnalysis }) => {
  const reco = useRecommendation(riskAnalysis)

  if (!reco) return null

  const { Icon, bgClassName, iconClassName, textClassName, title, description } = reco

  return (
    <div
      className={classNames(
        "leading-paragraph flex w-full gap-8 rounded p-4",
        bgClassName,
        textClassName,
      )}
    >
      <div className="flex flex-col justify-center">
        <div className={classNames("rounded-full p-4", iconClassName)}>
          <Icon className="h-12 w-12" />
        </div>
      </div>
      <div className="flex w-full grow flex-col justify-center gap-1">
        <div className="font-bold">{title}</div>
        <div className="text-body-secondary">{description}</div>
      </div>
    </div>
  )
}

export const RiskAnalysisRecommendation: FC<{
  riskAnalysis: EvmRiskAnalysis
}> = ({ riskAnalysis }) => {
  const risks = useMemo(
    () =>
      riskAnalysis.result?.validation.scanners
        ? Object.entries(riskAnalysis.result?.validation.scanners)
            .filter(([, value]) => value?.label)
            .map(([name, value]) => ({ name, ...value.label }) as TenderlyScannerFinding)
        : [],
    [riskAnalysis.result],
  )

  return risks.length ? (
    <RiskAnalysisWarnings warnings={risks} />
  ) : (
    <RiskAnalysisRecommendationInner riskAnalysis={riskAnalysis} />
  )
}
