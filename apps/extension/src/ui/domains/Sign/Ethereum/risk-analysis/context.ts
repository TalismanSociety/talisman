import { provideContext } from "@talisman/util/provideContext"
import { EvmMessageRiskAnalysis } from "@ui/domains/Ethereum/useEvmMessageRiskAnalysis"
import { EvmTransactionRiskAnalysis } from "@ui/domains/Ethereum/useEvmTransactionRiskAnalysis"

type RisksAnalysisProviderProps = {
  riskAnalysis?: EvmTransactionRiskAnalysis | EvmMessageRiskAnalysis
}

const useRisksAnalysisProvider = ({ riskAnalysis }: RisksAnalysisProviderProps) => {
  return riskAnalysis
}

export type RisksAnalysisState = ReturnType<typeof useRisksAnalysisProvider>

export const [RiskAnalysisProvider, useRiskAnalysis] = provideContext(useRisksAnalysisProvider)
