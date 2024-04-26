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
import { EvmRiskAnalysis } from "./types"

const useRecommendation = ({
  type,
  isAvailable,
  isValidating,
  result,
  scanError,
}: EvmRiskAnalysis) => {
  const { t } = useTranslation()

  return useMemo(() => {
    if (scanError)
      return {
        Icon: ShieldUnknownIcon,
        bgClassName: "bg-grey-800",
        iconClassName: "text-body-disabled",
        ...scanError,
      }

    switch (result?.action) {
      case "BLOCK":
        return {
          Icon: ShieldNotOkIcon,
          bgClassName: "bg-brand-orange/10",
          textClassName: "text-brand-orange",
          iconClassName: "bg-brand-orange/10",
          title: t("Critical Risk"),
          // in this case there should always be at least 1 warning
          description: result.warnings[0]?.message ?? "",
        }
      case "WARN":
        return {
          Icon: ShieldZapIcon,
          bgClassName: "bg-alert-warn/10",
          textClassName: "text-alert-warn",
          iconClassName: "bg-alert-warn/10",
          title: t("Medium Risk"),
          // in this case there should always be at least 1 warning
          description: result.warnings[0]?.message ?? "",
        }
      case "NONE":
        return {
          Icon: ShieldOkIcon,
          bgClassName: "bg-green/10",
          textClassName: "text-green",
          iconClassName: "bg-green/10",
          title: result.warnings.length ? t("No Risk Found") : t("Low Risk"),
          description:
            result.warnings[0]?.message ??
            (type === "transaction"
              ? t("No risks were identified while analysing this transaction")
              : t("No risks were identified while analysing this message")),
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
          "Risk Assessment is not supported for this network. Proceed at your own risk."
        ),
      }
    }
    return {
      Icon: ShieldUnknownIcon, // TODO spinner ?
      bgClassName: "bg-body-secondary/10",
      textClassName: "text-body-secondary",
      iconClassName: "bg-body-secondary/10",
      title: isValidating ? t("In Progress") : t("TODO NOT VALIDATING"),
      description: isValidating
        ? t("Risk assessment is in progress, please wait.")
        : t("TODO NOT VALIDATING"), // TODO
    }
  }, [isAvailable, isValidating, result?.action, result?.warnings, scanError, t, type])
}

const RiskAnalysisRecommendationInner: FC<{
  riskAnalysis: EvmRiskAnalysis
}> = ({ riskAnalysis }) => {
  const recommendation = useRecommendation(riskAnalysis)

  const { Icon, bgClassName, iconClassName, textClassName, title, description } = recommendation

  return (
    <div
      className={classNames(
        "leading-paragraph flex w-full gap-8 rounded p-4",
        bgClassName,
        textClassName
      )}
    >
      <div>
        <div className={classNames("rounded-full p-4", bgClassName, iconClassName)}>
          <Icon className="h-12 w-12" />
        </div>
      </div>
      <div className="flex w-full grow flex-col justify-center gap-1">
        <div className="font-bold">{title}</div>
        <div className="text-body-secondary ">{description}</div>
      </div>
    </div>
  )
}

export const RiskAnalysisRecommendation: FC<{
  riskAnalysis: EvmRiskAnalysis
}> = ({ riskAnalysis }) => {
  return riskAnalysis.result?.warnings.length ? (
    <RiskAnalysisWarnings warnings={riskAnalysis.result.warnings} />
  ) : (
    <RiskAnalysisRecommendationInner riskAnalysis={riskAnalysis} />
  )
}
