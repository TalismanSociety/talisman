import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { useState } from "react"

export const useRiskAnalysis = (isRiskAknowledgementRequired: boolean) => {
  const [isRiskAknowledged, setIsRiskAknowledged] = useState(false)

  const riskAnalysisDrawer = useOpenClose(false)

  return {
    isRiskAknowledgementRequired,
    isRiskAknowledged,
    setIsRiskAknowledged,
    riskAnalysisDrawer,
  }
}

export type EvmTransactionRiskAnalysis = ReturnType<typeof useRiskAnalysis>
