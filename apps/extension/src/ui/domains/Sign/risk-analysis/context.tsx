import { provideContext } from "@ui/util/provideContext"
import type { FC, ReactNode } from "react"

import { RiskAnalysisDrawers } from "./RiskAnalysisDrawers"
import type { RiskAnalysis } from "./types"

type RisksAnalysisProviderProps = {
  riskAnalysis?: RiskAnalysis
}

const useRisksAnalysisProvider = ({ riskAnalysis }: RisksAnalysisProviderProps) => {
  return riskAnalysis
}

const [RiskAnalysisProviderInner, useRiskAnalysis] = provideContext(useRisksAnalysisProvider)

export const RiskAnalysisProvider: FC<
  RisksAnalysisProviderProps & { children: ReactNode; onReject?: () => void; containerId?: string }
> = ({ riskAnalysis, children, onReject, containerId }) => {
  return (
    <RiskAnalysisProviderInner riskAnalysis={riskAnalysis}>
      {children}
      <RiskAnalysisDrawers
        riskAnalysis={riskAnalysis}
        onReject={onReject}
        containerId={containerId}
      />
    </RiskAnalysisProviderInner>
  )
}

export { useRiskAnalysis }
