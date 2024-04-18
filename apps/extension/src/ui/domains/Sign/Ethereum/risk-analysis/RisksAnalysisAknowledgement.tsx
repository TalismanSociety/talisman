import { t } from "i18next"
import { ChangeEventHandler, FC, useCallback } from "react"
import { Checkbox } from "talisman-ui"

import { useRiskAnalysis } from "./context"

export const RisksAnalysisAknowledgement: FC = () => {
  const { isRiskAknowledged, isRiskAknowledgementRequired, setIsRiskAknowledged } =
    useRiskAnalysis()

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setIsRiskAknowledged(e.target.checked)
    },
    [setIsRiskAknowledged]
  )

  if (!isRiskAknowledgementRequired) return null

  return (
    <div className="flex w-full items-center justify-between text-sm">
      <div>{t("I aknowledge the risks")}</div>
      <div>
        <Checkbox defaultChecked={isRiskAknowledged} onChange={handleChange} />
      </div>
    </div>
  )
}
