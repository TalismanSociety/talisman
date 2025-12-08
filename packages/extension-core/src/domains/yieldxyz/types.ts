import { Loadable } from "@talismn/util"
import {
  BalanceDto,
  YieldBalancesDto,
  YieldDto,
  YieldsControllerGetYieldsParams,
} from "@yieldxyz/sdk"

// TODO rename everything as yieldxyz
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
  PendingActionDto,
} from "@yieldxyz/sdk"

// Extend SDK params to support comma-separated inputToken values
export interface YieldxyzControllerGetYieldsBatchParams extends YieldsControllerGetYieldsParams {
  inputTokens?: string // Comma-separated token addresses/symbols
}

// Also extend the base SDK params to support inputTokens for backward compatibility
export interface YieldxyzControllerGetYieldsParamsExtended extends YieldsControllerGetYieldsParams {
  inputTokens?: string // Comma-separated token addresses/symbols
}

export interface YieldxyzPositionItem {
  yieldId: string
  balances: BalanceDto[]
}
export interface YieldxyzBalancesDtoWithProduct extends YieldBalancesDto {
  product?: YieldDto
}

// Simplified yield position with validator grouping
export interface YieldxyzPosition extends YieldxyzBalancesDtoWithProduct {
  // Validator address if applicable
  validatorAddress?: string
  // Display-ready fields
  displayName: string
  totalAmountUsd: number
  // networkId: string
}

// UI subscription response type (store-backed), mirroring DeFi
// export type YieldxyzPositionsResponse = import("@talismn/util").Loadable<
//   YieldxyzBalancesDtoWithProduct[]
// >
export type YieldxyzPositionsGroupedResponse = Loadable<YieldxyzPosition[]>

// Message type augmentation for handler routing
export interface YieldxyzMessages {
  // "pri(yieldxyz.balances.subscribe)": [null, boolean, YieldxyzPositionsResponse]
  "pri(yieldxyz.balances.grouped.subscribe)": [null, boolean, YieldxyzPositionsGroupedResponse]
}
