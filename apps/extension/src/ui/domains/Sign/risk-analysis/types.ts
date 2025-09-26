import { TransactionScanResponse } from "@blockaid/client/resources/index.mjs"
import { MessageScanResponse } from "@blockaid/client/resources/solana/message.mjs"

import { useEvmMessageRiskAnalysis } from "./ethereum/useEvmMessageRiskAnalysis"
import { useEvmTransactionRiskAnalysis } from "./ethereum/useEvmTransactionRiskAnalysis"
import { useSolTransactionRiskAnalysis } from "./solana/useSolTransactionRiskAnalysis"
import { useRisksReview } from "./useRisksReview"

export type RiskAnalysisPlatform = "ethereum" | "solana"

export type RiskAnalysisResponse<T = RiskAnalysisPlatform> = T extends "ethereum"
  ? TransactionScanResponse
  : T extends "solana"
    ? MessageScanResponse
    : never

export type RiskAnalysis =
  | ReturnType<typeof useEvmMessageRiskAnalysis>
  | ReturnType<typeof useEvmTransactionRiskAnalysis>
  | ReturnType<typeof useSolTransactionRiskAnalysis>

export type RisksReview = ReturnType<typeof useRisksReview>

export type RiskAnalysisScanError = { title: string; description: string }
