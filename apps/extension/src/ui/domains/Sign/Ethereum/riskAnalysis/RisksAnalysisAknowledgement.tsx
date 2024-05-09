import { t } from "i18next"
import { ChangeEventHandler, FC, useCallback } from "react"
import { Checkbox } from "talisman-ui"

import { EvmRiskAnalysis } from "./types"

export const RisksAnalysisAknowledgement: FC<{ riskAnalysis: EvmRiskAnalysis }> = ({
  riskAnalysis,
}) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      riskAnalysis.review.setIsRiskAknowledged(e.target.checked)
    },
    [riskAnalysis.review]
  )

  if (!riskAnalysis.review.isRiskAknowledgementRequired) return null

  return (
    <div className="flex w-full items-center justify-between text-sm">
      <div>{t("I aknowledge the risks")}</div>
      <div>
        <Checkbox defaultChecked={riskAnalysis.review.isRiskAknowledged} onChange={handleChange} />
      </div>
    </div>
  )
}
