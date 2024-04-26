import {
  ScanMessageEvm200Response,
  ScanTransactionsEvm200Response,
} from "@blowfishxyz/api-client/v20230605"

import { useEvmMessageRiskAnalysis } from "./useEvmMessageRiskAnalysis"
import { useEvmTransactionRiskAnalysis } from "./useEvmTransactionRiskAnalysis"
import { useRisksReview } from "./useRisksReview"

export type EvmRiskAnalysis =
  | ReturnType<typeof useEvmMessageRiskAnalysis>
  | ReturnType<typeof useEvmTransactionRiskAnalysis>

export type RisksReview = ReturnType<typeof useRisksReview>

export type PayloadType = "message" | "transaction"

export type ResponseType<Type extends PayloadType> = Type extends "message"
  ? ScanMessageEvm200Response | null
  : Type extends "transaction"
  ? ScanTransactionsEvm200Response | null
  : never

export type RiskAnalysisScanError = { title: string; description: string }
