import { useEvmMessageRiskAnalysis } from "./useEvmMessageRiskAnalysis"
import { useEvmTransactionRiskAnalysis } from "./useEvmTransactionRiskAnalysis"
import { useRisksReview } from "./useRisksReview"

export type EvmRiskAnalysis =
  | ReturnType<typeof useEvmMessageRiskAnalysis>
  | ReturnType<typeof useEvmTransactionRiskAnalysis>

export type RisksReview = ReturnType<typeof useRisksReview>
