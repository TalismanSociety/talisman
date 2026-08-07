import { provideContext } from "@ui/util/provideContext"
import { createContext, type FC, type ReactNode, useContext } from "react"

import { RiskAnalysisDrawers } from "./RiskAnalysisDrawers"
import type { RiskAnalysis } from "./types"

type RisksAnalysisProviderProps = {
  riskAnalysis?: RiskAnalysis
}

const useRisksAnalysisProvider = ({ riskAnalysis }: RisksAnalysisProviderProps) => {
  return riskAnalysis
}

const [RiskAnalysisProviderInner, useRiskAnalysis] = provideContext(useRisksAnalysisProvider)

const OptionalRiskAnalysisContext = createContext<RiskAnalysis | undefined>(undefined)

/**
 * `useRiskAnalysis` assumes it is called within a provider, and returns an unusable placeholder
 * when it isn't. This one is for components that are shared between flows which have a risk
 * analysis and flows which don't.
 */
export const useOptionalRiskAnalysis = () => useContext(OptionalRiskAnalysisContext)

export const RiskAnalysisProvider: FC<
  RisksAnalysisProviderProps & { children: ReactNode; onReject?: () => void; containerId?: string }
> = ({ riskAnalysis, children, onReject, containerId }) => {
  return (
    <OptionalRiskAnalysisContext.Provider value={riskAnalysis}>
      <RiskAnalysisProviderInner riskAnalysis={riskAnalysis}>
        {children}
        <RiskAnalysisDrawers
          riskAnalysis={riskAnalysis}
          onReject={onReject}
          containerId={containerId}
        />
      </RiskAnalysisProviderInner>
    </OptionalRiskAnalysisContext.Provider>
  )
}

export { useRiskAnalysis }
