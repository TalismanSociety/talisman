import { provideContext } from "@talisman/util/provideContext"
import { EvmRiskAnalysis } from "@ui/domains/Ethereum/riskAnalysis"
import { log } from "extension-shared"
import { useEffect } from "react"

type RisksAnalysisProviderProps = {
  riskAnalysis?: EvmRiskAnalysis
}

const useRisksAnalysisProvider = ({ riskAnalysis }: RisksAnalysisProviderProps) => {
  useEffect(() => {
    log.debug("RiskAnalysisProvider", riskAnalysis)
  }, [riskAnalysis])

  return riskAnalysis
}

export const [RiskAnalysisProvider, useRiskAnalysis] = provideContext(useRisksAnalysisProvider)
