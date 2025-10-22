import {
  BalanceDto,
  YieldBalancesDto,
  YieldDto,
  YieldsControllerGetYieldsParams,
} from "@yieldxyz/sdk"

// Re-export SDK types for use in UI
export type {
  YieldDto,
  YieldBalancesRequestDto,
  YieldBalancesDto,
  BalancesRequestDto,
  BalancesResponseDto,
  CreateActionDto,
  CreateManageActionDto,
  ActionDto,
  TransactionDto,
  SubmitHashDto,
  NetworkDto,
  ProviderDto,
  HealthStatusDto,
  YieldsControllerGetYieldsParams,
  Networks,
  BalanceDto,
  TokenDto,
  ValidatorDto,
  YieldsControllerGetYieldValidators200,
} from "@yieldxyz/sdk"

// Extend SDK params to support comma-separated inputToken values
export interface YieldsControllerGetYieldsBatchParams extends YieldsControllerGetYieldsParams {
  inputTokens?: string // Comma-separated token addresses/symbols
}

// Also extend the base SDK params to support inputTokens for backward compatibility
export interface YieldsControllerGetYieldsParamsExtended extends YieldsControllerGetYieldsParams {
  inputTokens?: string // Comma-separated token addresses/symbols
}

export interface YieldPositionItem {
  yieldId: string
  balances: BalanceDto[]
}
export interface YieldBalancesDtoWithProduct extends YieldBalancesDto {
  product?: YieldDto
}

// Simplified yield position with validator grouping
export interface YieldPosition extends YieldBalancesDtoWithProduct {
  // Validator address if applicable
  validatorAddress?: string
  // Display-ready fields
  displayName: string
  totalAmountUsd: number
  networkId: string
}

// UI subscription response type (store-backed), mirroring DeFi
export type YieldPositionsResponse = import("@talismn/util").Loadable<YieldBalancesDtoWithProduct[]>
export type YieldPositionsGroupedResponse = import("@talismn/util").Loadable<YieldPosition[]>

// Message type augmentation for handler routing
export interface YieldMessages {
  "pri(yield.balances.subscribe)": [null, boolean, YieldPositionsResponse]
  "pri(yield.balances.grouped.subscribe)": [null, boolean, YieldPositionsGroupedResponse]
}
