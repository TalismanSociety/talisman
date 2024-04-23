import { provideContext } from "@talisman/util/provideContext"
import { EvmRiskAnalysis } from "@ui/domains/Ethereum/riskAnalysis"

type RisksAnalysisProviderProps = {
  riskAnalysis?: EvmRiskAnalysis
}

const useRisksAnalysisProvider = ({ riskAnalysis }: RisksAnalysisProviderProps) => {
  return riskAnalysis
}

export const [RiskAnalysisProvider, useRiskAnalysis] = provideContext(useRisksAnalysisProvider)
