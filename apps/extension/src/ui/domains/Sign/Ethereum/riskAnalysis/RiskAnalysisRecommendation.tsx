/* eslint-disable @typescript-eslint/no-unused-vars */
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

import { EvmRiskAnalysis } from "./types"

const useRecommendation = ({ isAvailable, result, scanError }: EvmRiskAnalysis) => {
  const { t } = useTranslation()

  return useMemo(() => {
    if (scanError)
      return {
        Icon: ShieldUnknownIcon,
        bgClassName: "bg-grey-800",
        iconClassName: "text-body-disabled",
        ...scanError,
      }

    switch (result?.validation?.result_type) {
      case "Malicious":
        return {
          Icon: ShieldNotOkIcon,
          bgClassName: "bg-brand-orange/10",
          textClassName: "text-brand-orange",
          iconClassName: "bg-brand-orange/10",
          title: t("Critical Risk"),
          // in this case there should always be at least 1 warning
          description: result.validation.description ?? "",
        }
      case "Warning":
        return {
          Icon: ShieldZapIcon,
          bgClassName: "bg-alert-warn/10",
          textClassName: "text-alert-warn",
          iconClassName: "bg-alert-warn/10",
          title: t("Medium Risk"),
          // in this case there should always be at least 1 warning
          description: result.validation.description ?? "", // result.warnings[0]?.message ?? "",
        }
      case "Benign":
        return {
          Icon: ShieldOkIcon,
          bgClassName: "bg-green/10",
          textClassName: "text-green",
          iconClassName: "bg-green/10",
          title: t("Low Risk"), // result.warnings.length ? t("No Risk Found") : t("Low Risk"),
          description: t("No risks were identified"),
          // result.warnings[0]?.message ??
          // (type === "transaction"
          //   ? t("No risks were identified in this transaction")
          //   : t("No risks were identified in this message")),
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
  }, [isAvailable, result, scanError, t])
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
  // if (riskAnalysis.result?.validation?.result_type === "Benign")
  return <RiskAnalysisRecommendationInner riskAnalysis={riskAnalysis} />

  // return null // TODO
  //   return riskAnalysis.result?.warnings.length ? (
  //     <>TODO WARNINGS</>
  //  //   <RiskAnalysisWarnings warnings={riskAnalysis.result.warnings} />
  //   ) : (
  //     <RiskAnalysisRecommendationInner riskAnalysis={riskAnalysis} />
  //   )
}
