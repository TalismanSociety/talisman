import { t } from "i18next"
import { ChangeEventHandler, FC, useCallback } from "react"
import { Checkbox } from "talisman-ui"

import { RisksReview } from "./useRisksReview"

export const RisksAnalysisAknowledgement: FC<{
  risksReview: RisksReview
}> = ({ risksReview }) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      risksReview.setIsRiskAknowledged(e.target.checked)
    },
    [risksReview]
  )

  if (!risksReview.isRiskAknowledgementRequired) return null

  return (
    <div className="flex w-full items-center justify-between text-sm">
      <div>{t("I aknowledge the risks")}</div>
      <div>
        <Checkbox onChange={handleChange} />
      </div>
    </div>
  )
}
