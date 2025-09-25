import { log } from "extension-shared"
import { FC, ReactNode, useEffect } from "react"

import { provideContext } from "@talisman/util/provideContext"

import { RiskAnalysisDrawers } from "./RiskAnalysisDrawers"
import { RiskAnalysis } from "./types"

type RisksAnalysisProviderProps = {
  riskAnalysis?: RiskAnalysis
}

const useRisksAnalysisProvider = ({ riskAnalysis }: RisksAnalysisProviderProps) => {
  useEffect(() => {
    log.debug("useRisksAnalysis", { riskAnalysis })
  }, [riskAnalysis])
  return riskAnalysis
}

const [RiskAnalysisProviderInner, useRiskAnalysis] = provideContext(useRisksAnalysisProvider)

export const RiskAnalysisProvider: FC<
  RisksAnalysisProviderProps & { children: ReactNode; onReject?: () => void }
> = ({ riskAnalysis, children, onReject }) => {
  return (
    <RiskAnalysisProviderInner riskAnalysis={riskAnalysis}>
      {children}
      <RiskAnalysisDrawers riskAnalysis={riskAnalysis} onReject={onReject} />
    </RiskAnalysisProviderInner>
  )
}

export { useRiskAnalysis }
