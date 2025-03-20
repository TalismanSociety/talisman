import { FC, ReactNode } from "react"

import { provideContext } from "@talisman/util/provideContext"

import { RiskAnalysisDrawers } from "./RiskAnalysisDrawers"
import { EvmRiskAnalysis } from "./types"

type RisksAnalysisProviderProps = {
  riskAnalysis?: EvmRiskAnalysis
  signer?: string
}

const useRisksAnalysisProvider = ({ riskAnalysis }: RisksAnalysisProviderProps) => {
  return riskAnalysis
}

const [RiskAnalysisProviderInner, useRiskAnalysis] = provideContext(useRisksAnalysisProvider)

export const RiskAnalysisProvider: FC<
  RisksAnalysisProviderProps & { children: ReactNode; onReject?: () => void }
> = ({ riskAnalysis, signer, children, onReject }) => {
  return (
    <RiskAnalysisProviderInner riskAnalysis={riskAnalysis}>
      {children}
      <RiskAnalysisDrawers riskAnalysis={riskAnalysis} signer={signer} onReject={onReject} />
    </RiskAnalysisProviderInner>
  )
}

export { useRiskAnalysis }
