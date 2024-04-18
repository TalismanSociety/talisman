import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { EvmMessageRiskAnalysis } from "@ui/domains/Ethereum/useEvmMessageRiskAnalysis"
import { EvmTransactionRiskAnalysis } from "@ui/domains/Ethereum/useEvmTransactionRiskAnalysis"
import { useMemo, useState } from "react"

type RisksAnalysisProviderProps = {
  riskAnalysis?: EvmTransactionRiskAnalysis | EvmMessageRiskAnalysis
}

const useRisksAnalysisProvider = ({ riskAnalysis }: RisksAnalysisProviderProps) => {
  const [isRiskAknowledged, setIsRiskAknowledged] = useState(false)

  const drawer = useOpenClose(false)

  const isRiskAknowledgementRequired = useMemo(
    () => riskAnalysis?.result?.action === "BLOCK",
    [riskAnalysis]
  )

  return {
    isRiskAknowledgementRequired,
    isRiskAknowledged,
    setIsRiskAknowledged,
    drawer,
    riskAnalysis,
  }
}

export type RisksAnalysisState = ReturnType<typeof useRisksAnalysisProvider>

export const [RiskAnalysisProvider, useRiskAnalysis] = provideContext(useRisksAnalysisProvider)
