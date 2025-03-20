import { useEvmMessageRiskAnalysis } from "./useEvmMessageRiskAnalysis"
import { useEvmTransactionRiskAnalysis } from "./useEvmTransactionRiskAnalysis"
import { useRisksReview } from "./useRisksReview"

export type TenderlyActionType = "Safe" | "Warning" | "Dangerous" | "Error"

export type TenderlyAssetType = "Fungible" | "Native" | "NonFungible"

export type TenderlyAssetInfo = {
  standard: string // "ERC20" | "NativeCurrency",
  type: TenderlyAssetType
  contractAddress: string
  symbol: string
  name: string
  logo: string
  decimals: number
  dollarValue: number
}

export type TenderlyAssetChange = {
  assetInfo: TenderlyAssetInfo
  type: string // "Transfer" | "Mint"
  from?: string // undefined if mint
  to: string
  rawAmount: string // hex wei
  amount: string
  dollarValue: string
}

export type TenderlyExposureChange = {
  assetInfo: TenderlyAssetInfo
  type: string // "Permit" "Approve"
  owner: string
  spender: string
  rawAmount: string // hex wei
  dollarValue: string
  amount: string
  // dollarValue: string
}

export type TenderlyChange =
  | ({ kind: "exposure" } & TenderlyExposureChange)
  | ({ kind: "asset" } & TenderlyAssetChange)

export type TenderlyScannerValue = {
  label: {
    reason: string
    severity: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH"
    victims?: string[]
    attackers?: string[]
  } | null
}

export type TenderlyScannerFinding = {
  name: string
  reason: string
  severity: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH"
  victims?: string[]
  attackers?: string[]
}

type TenderlyTransactionSimulationResult = {
  validation: {
    status: "success" | "revert"
    actionType: TenderlyActionType
    actionReason?: string
    summary?: string
    scanners: Record<string, TenderlyScannerValue>
  }
  // aggregated
  // gasEstimation
  simulation: {
    status: boolean
    gasUsed: string
    cumulativeGasUsed: string
    blockNumber: string
    type: string // hex, tx type (0 or 2)
    // logsBloom: string
    // logs: unknown[]
    // trace: unknown[]
    assetChanges?: TenderlyAssetChange[] // only for txs
    exposureChanges?: TenderlyExposureChange[] // only for message
  }
  // aggregated: {

  // }
}

export type EvmRiskAnalysis =
  | ReturnType<typeof useEvmMessageRiskAnalysis>
  | ReturnType<typeof useEvmTransactionRiskAnalysis>

export type RisksReview = ReturnType<typeof useRisksReview>

export type PayloadType = "message" | "transaction"

export type ResponseType<Type extends PayloadType> = Type extends "message"
  ? TenderlyTransactionSimulationResult | null
  : Type extends "transaction"
    ? TenderlyTransactionSimulationResult | null
    : never

export type RiskAnalysisScanError = { title: string; description: string }
