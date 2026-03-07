import { Checkbox } from "@ui/components/Checkbox"
import { t } from "i18next"
import { type ChangeEventHandler, type FC, useCallback } from "react"

import type { RiskAnalysis } from "./types"

export const RisksAnalysisAcknowledgement: FC<{ riskAnalysis: RiskAnalysis }> = ({
  riskAnalysis,
}) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      riskAnalysis.review.setIsRiskAcknowledged(e.target.checked)
    },
    [riskAnalysis.review]
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
