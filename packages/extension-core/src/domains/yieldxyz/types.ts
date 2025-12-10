import { Address } from "@talismn/balances"
import { NetworkId } from "@talismn/chaindata-provider"
import { Loadable } from "@talismn/util"
import { BalanceDto, YieldDto, YieldsControllerGetYieldsParams } from "@yieldxyz/sdk"

import { YieldxyzProvider } from "./fetchYieldxyzProviders"

// TODO rename everything as yieldxyz
// Re-export SDK types for use in UI
export type {
  ActionDto,
  BalanceDto,
  BalancesRequestDto,
  BalancesResponseDto,
  CreateActionDto,
  CreateManageActionDto,
  HealthStatusDto,
  NetworkDto,
  Networks,
  PendingActionDto,
  ProviderDto,
  SubmitHashDto,
  TokenDto,
  TransactionDto,
  ValidatorDto,
  YieldBalancesDto,
  YieldBalancesRequestDto,
  YieldDto,
  YieldsControllerGetYieldsParams,
  YieldsControllerGetYieldValidators200,
} from "@yieldxyz/sdk"

// Extend SDK params to support comma-separated inputToken values
export interface YieldxyzControllerGetYieldsBatchParams extends YieldsControllerGetYieldsParams {
  inputTokens?: string // Comma-separated token addresses/symbols
}

// Also extend the base SDK params to support inputTokens for backward compatibility
export interface YieldxyzControllerGetYieldsParamsExtended extends YieldsControllerGetYieldsParams {
  inputTokens?: string // Comma-separated token addresses/symbols
}

// export interface YieldxyzPositionItem {
//   yieldId: string
//   balances: BalanceDto[]
// }
// export interface YieldxyzBalancesDtoWithProduct extends YieldBalancesDto {
//   product?: YieldDto
//   // Maps addresses to their originating Talisman and yield.xyz network IDs for reconstruction
//   // addressNetworkIdMap?: Record<Address, NetworkId>
//   // addressYieldxyzNetworkIdMap?: Record<Address, Networks>
// }

export type YieldxyzPosition = {
  yieldId: string
  networkId: NetworkId
  address: Address
  product: YieldDto
  balances: BalanceDto[]
}

// Simplified yield position with validator grouping
export type YieldxyzPositionEnhanced = YieldxyzPosition & {
  // Validator address if applicable
  validatorAddress?: string
  // Display-ready fields
  displayName: string
  totalAmountUsd: number
}

// UI subscription response type (store-backed), mirroring DeFi
// export type YieldxyzPositionsResponse = import("@talismn/util").Loadable<
//   YieldxyzBalancesDtoWithProduct[]
// >
export type YieldxyzPositionsResponse = Loadable<YieldxyzPosition[]>
export type YieldxyzOpportunitiesResponse = Loadable<YieldDto[]>
export type YieldxyzProvidersResponse = Loadable<YieldxyzProvider[]>

// Message type augmentation for handler routing
export interface YieldxyzMessages {
  "pri(yieldxyz.positions.subscribe)": [null, boolean, YieldxyzPositionsResponse]
  "pri(yieldxyz.opportunities.subscribe)": [null, boolean, YieldxyzOpportunitiesResponse]
  "pri(yieldxyz.providers.subscribe)": [null, boolean, YieldxyzProvidersResponse]
}
