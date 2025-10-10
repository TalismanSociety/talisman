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

import { RiskAnalysis } from "./types"

const getValidationDescription = (riskAnalysis: RiskAnalysis) => {
  if (riskAnalysis.platform === "ethereum")
    return riskAnalysis.result?.validation?.description ?? "" // TODO ?
  if (riskAnalysis.platform === "solana")
    return riskAnalysis.result?.result?.validation?.reason ?? ""
  return undefined
}

const useRecommendation = (riskAnalysis: RiskAnalysis) => {
  const { t } = useTranslation()

  return useMemo(() => {
    if (riskAnalysis.scanError)
      return {
        Icon: ShieldUnknownIcon,
        bgClassName: "bg-grey-800",
        iconClassName: "text-body-disabled",
        ...riskAnalysis.scanError,
      }

    switch (riskAnalysis.validationResult) {
      case "Malicious":
        return {
          Icon: ShieldNotOkIcon,
          bgClassName: "bg-brand-orange/10",
          textClassName: "text-brand-orange",
          iconClassName: "bg-brand-orange/10",
          title: t("Critical Risk"),
          // in this case there should always be at least 1 warning
          description: getValidationDescription(riskAnalysis) ?? "",
        }
      case "Warning":
        return {
          Icon: ShieldZapIcon,
          bgClassName: "bg-alert-warn/10",
          textClassName: "text-alert-warn",
          iconClassName: "bg-alert-warn/10",
          title: t("Medium Risk"),
          // in this case there should always be at least 1 warning
          description: getValidationDescription(riskAnalysis) ?? "", // result.warnings[0]?.message ?? "",
        }
      case "Benign":
        return {
          Icon: ShieldOkIcon,
          bgClassName: "bg-green/10",
          textClassName: "text-green",
          iconClassName: "bg-green/10",
          title: t("Low Risk"),
          description: t("No risks were identified"),
        }
      case "Error": {
        return {
          Icon: ShieldUnknownIcon,
          bgClassName: "bg-grey-800",
          textClassName: "text-body-secondary",
          iconClassName: "text-body-disabled",
          title: t("Analysis Error"),
          description: t("Proceed at your own risk."),
        }
      }
    }
    if (!riskAnalysis.isAvailable) {
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
  }, [riskAnalysis, t])
}

const RiskAnalysisRecommendationInner: FC<{
  riskAnalysis: RiskAnalysis
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
  riskAnalysis: RiskAnalysis
}> = ({ riskAnalysis }) => {
  return <RiskAnalysisRecommendationInner riskAnalysis={riskAnalysis} />
}
