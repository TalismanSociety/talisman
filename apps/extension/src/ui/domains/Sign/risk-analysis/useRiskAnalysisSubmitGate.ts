import type { TFunction } from "i18next"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useOptionalRiskAnalysis } from "./context"
import type { RiskAnalysis } from "./types"

export const getRiskAnalysisSubmitBlock = (
  riskAnalysis: RiskAnalysis | undefined,
  t: TFunction
): { isBlocked: boolean; message: string | null } => {
  if (!riskAnalysis) return { isBlocked: false, message: null }

  // a verdict that has not arrived yet cannot be acknowledged - nothing may be signed until it does
  if (riskAnalysis.isValidating) return { isBlocked: true, message: null }

  if (!riskAnalysis.review.isRiskAcknowledgementRequired || riskAnalysis.review.isRiskAcknowledged)
    return { isBlocked: false, message: null }

  return {
    isBlocked: true,
    message:
      riskAnalysis.validationResult === "Malicious"
        ? t("We suspect this transaction is harmful. Review the risk assessment to continue.")
        : t("Review the risk assessment to continue."),
  }
}

/**
 * dApp requests are signed from the sign screen, where `SignApproveButton` holds back a flagged
 * transaction until the user acknowledges the risks. In-wallet flows submit through
 * `TxSubmitButton` instead, which bypassed that check entirely — this applies the same rule.
 *
 * It applies here rather than in `SignApproveButton` alone because the Ledger branches of
 * `TxSubmitButtonEth` and `TxSubmitButtonSol` sign without ever rendering that button.
 */
export const useRiskAnalysisSubmitGate = () => {
  const { t } = useTranslation()
  const riskAnalysis = useOptionalRiskAnalysis()

  return useMemo(() => getRiskAnalysisSubmitBlock(riskAnalysis, t), [riskAnalysis, t])
}
