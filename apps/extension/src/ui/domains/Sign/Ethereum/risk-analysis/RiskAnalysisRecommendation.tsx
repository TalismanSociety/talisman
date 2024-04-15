import { ScanTransactionsResult } from "@extension/core"
import {
  ShieldNotOkIcon,
  ShieldOkIcon,
  ShieldUnavailableIcon,
  ShieldUnknownIcon,
  ShieldZapIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

export type RecommendationProps = {
  isAvailable: boolean
  isValidating: boolean
  result: ScanTransactionsResult | null | undefined
}

const useRecommendation = ({ isAvailable, isValidating, result }: RecommendationProps) => {
  const { t } = useTranslation()

  return useMemo(() => {
    switch (result?.action) {
      case "BLOCK":
        return {
          Icon: ShieldNotOkIcon,
          bgClassName: "bg-brand-orange/10",
          textClassName: "text-brand-orange",
          title: t("Critical Risk"),
          // in this case there should always be at least 1 warning
          description: result.warnings[0]?.message ?? "",
        }
      case "WARN":
        return {
          Icon: ShieldZapIcon,
          bgClassName: "bg-alert-warn/10",
          textClassName: "text-alert-warn",
          title: t("Medium Risk"),
          // in this case there should always be at least 1 warning
          description: result.warnings[0]?.message ?? "",
        }
      case "NONE":
        return {
          Icon: ShieldOkIcon,
          bgClassName: "bg-green/10",
          textClassName: "text-green",
          title: result.warnings.length ? t("No Risk Found") : t("Low Risk"),
          description:
            result.warnings[0]?.message ??
            t("No known risks were identified while analysing this transaction"),
        }
    }
    if (!isAvailable) {
      return {
        Icon: ShieldUnavailableIcon,
        bgClassName: "bg-body-secondary/10",
        textClassName: "text-body-secondary",
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
      title: isValidating ? t("In Progress") : t("TODO NOT VALIDATING"),
      description: isValidating
        ? t("Risk assessment is in progress, please wait.")
        : t("TODO NOT VALIDATING"), // TODO
    }
  }, [isAvailable, isValidating, result, t])
}

export const RiskAnalysisRecommendation: React.FC<RecommendationProps> = (props) => {
  const recommendation = useRecommendation(props)

  if (!recommendation) return null

  const { Icon, bgClassName, textClassName, title, description } = recommendation

  return (
    <div
      className={classNames(
        "leading-paragraph flex w-full gap-8 rounded p-4",
        bgClassName,
        textClassName
      )}
    >
      <div>
        <div className={classNames("rounded-full p-4", bgClassName)}>
          <Icon className="h-12 w-12" />
        </div>
      </div>
      <div className="flex w-full grow flex-col gap-1">
        <div className="font-bold">{title}</div>
        <div className="text-body-secondary ">{description}</div>
      </div>
    </div>
  )
}
