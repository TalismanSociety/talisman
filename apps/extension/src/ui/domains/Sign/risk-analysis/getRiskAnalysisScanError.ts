import { TFunction } from "i18next"

import { RiskAnalysisPlatform, RiskAnalysisResponse, RiskAnalysisScanError } from "./types"

export const getRiskAnalysisScanError = (
  platform: RiskAnalysisPlatform,
  response: RiskAnalysisResponse | null | undefined,
  t: TFunction,
): RiskAnalysisScanError | null => {
  if (!response) return null

  if (platform === "ethereum") {
    const res = response as RiskAnalysisResponse<"ethereum">
    if (res.validation?.result_type === "Error")
      return {
        title: t("Risk analysis failed, proceed at your own risk."),
        description: res.validation.error ?? t("Unknown error"),
      }
  }
  if (platform === "solana") {
    const res = response as RiskAnalysisResponse<"solana">
    if (res.error)
      return {
        title: t("Risk analysis failed, proceed at your own risk."),
        description: res.error ?? t("Unknown error"),
      }
  }

  return null
}
