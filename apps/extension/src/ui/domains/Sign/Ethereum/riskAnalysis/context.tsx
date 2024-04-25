import { provideContext } from "@talisman/util/provideContext"
import { log } from "extension-shared"
import { FC, ReactNode, useEffect } from "react"

import { RiskAnalysisDrawers } from "./RiskAnalysisDrawers"
import { EvmRiskAnalysis } from "./types"

type RisksAnalysisProviderProps = {
  riskAnalysis?: EvmRiskAnalysis
}

const useRisksAnalysisProvider = ({ riskAnalysis }: RisksAnalysisProviderProps) => {
  useEffect(() => {
    log.debug("RiskAnalysisProvider", riskAnalysis)
  }, [riskAnalysis])

  return riskAnalysis
}

const [RiskAnalysisProviderInner, useRiskAnalysis] = provideContext(useRisksAnalysisProvider)

export const RiskAnalysisProvider: FC<RisksAnalysisProviderProps & { children: ReactNode }> = ({
  riskAnalysis,
  children,
}) => {
  return (
    <RiskAnalysisProviderInner riskAnalysis={riskAnalysis}>
      {children}
      <RiskAnalysisDrawers riskAnalysis={riskAnalysis} />
    </RiskAnalysisProviderInner>
  )
}

export { useRiskAnalysis }
