import { TransactionScanResponse } from "@blockaid/client/resources/index.mjs"
import { MessageScanResponse } from "@blockaid/client/resources/solana/message.mjs"

import { useEvmMessageRiskAnalysis } from "./ethereum/useEvmMessageRiskAnalysis"
import { useEvmTransactionRiskAnalysis } from "./ethereum/useEvmTransactionRiskAnalysis"
import { useSolTransactionRiskAnalysis } from "./solana/useSolTransactionRiskAnalysis"
import { useRisksReview } from "./useRisksReview"

// export type RiskAnalysisResponseType = TransactionScanResponse | MessageScanResponse

// type MAP_RESPONSES = {
//   ethereum: TransactionScanResponse
//   solana: MessageScanResponse
// }

// export type RiskAnalysisPlatform = Prettify<keyof MAP_RESPONSES>

// export type RiskAnalysisResponse<T extends RiskAnalysisPlatform> = Prettify<MAP_RESPONSES[T]>

export type RiskAnalysisPlatform = "ethereum" | "solana"

export type RiskAnalysisResponse<T = RiskAnalysisPlatform> = T extends "ethereum"
  ? TransactionScanResponse
  : T extends "solana"
    ? MessageScanResponse
    : never

// export type RiskAnalysisResponse =
//   | {
//       platform: "solana"
//       data: MessageScanResponse
//     }
//   | {
//       platform: "ethereum"
//       data: TransactionScanResponse // actually works for both messages and transactions
//     }
export type RiskAnalysis =
  | ReturnType<typeof useEvmMessageRiskAnalysis>
  | ReturnType<typeof useEvmTransactionRiskAnalysis>
  | ReturnType<typeof useSolTransactionRiskAnalysis>

export type RisksReview = ReturnType<typeof useRisksReview>

export type RiskAnalysisScanError = { title: string; description: string }
