import { t } from "i18next"
import { ChangeEventHandler, FC, useCallback } from "react"
import { Checkbox } from "talisman-ui"

import { EvmRiskAnalysis } from "./types"

export const RisksAnalysisAcknowledgement: FC<{ riskAnalysis: EvmRiskAnalysis }> = ({
  riskAnalysis,
}) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      riskAnalysis.review.setIsRiskAcknowledged(e.target.checked)
    },
    [riskAnalysis.review],
  )

  if (!riskAnalysis.review.isRiskAcknowledgementRequired) return null

  return (
    <div className="flex w-full items-center justify-between text-sm">
      <div>{t("I acknowledge the risks")}</div>
      <div>
        <Checkbox defaultChecked={riskAnalysis.review.isRiskAcknowledged} onChange={handleChange} />
      </div>
    </div>
  )
}
