import { useSolTransactionRiskAnalysis } from "../../Solana/riskAnalysis/useSolTransactionRiskAnalysis"
import { useEvmMessageRiskAnalysis } from "./useEvmMessageRiskAnalysis"
import { useEvmTransactionRiskAnalysis } from "./useEvmTransactionRiskAnalysis"
import { useRisksReview } from "./useRisksReview"

export type RiskAnalysis =
  | ReturnType<typeof useEvmMessageRiskAnalysis>
  | ReturnType<typeof useEvmTransactionRiskAnalysis>
  | ReturnType<typeof useSolTransactionRiskAnalysis>

export type RisksReview = ReturnType<typeof useRisksReview>

export type RiskAnalysisScanError = { title: string; description: string }
