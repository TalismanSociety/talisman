import { FC } from "react"

import { RiskAnalysis } from "../Ethereum/riskAnalysis/types"
import { RiskAnalysisStateChangesEth } from "./ethereum/RiskAnalysisStateChangesEth"
import { RiskAnalysisStateChangesSol } from "./solana/RiskAnalysisStateChangesSol"

export const RiskAnalysisStateChanges: FC<{ riskAnalysis: RiskAnalysis; noTitle?: boolean }> = ({
  riskAnalysis,
  noTitle,
}) => {
  switch (riskAnalysis.platform) {
    case "ethereum":
      return <RiskAnalysisStateChangesEth riskAnalysis={riskAnalysis} noTitle={noTitle} />
    case "solana":
      return <RiskAnalysisStateChangesSol riskAnalysis={riskAnalysis} noTitle={noTitle} />
    default:
      return null
  }
}
