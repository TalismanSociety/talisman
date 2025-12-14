import { Address } from "@talismn/balances"
import { NetworkId } from "@talismn/chaindata-provider"
import { Loadable } from "@talismn/util"
import { BalanceDto, YieldDto, YieldsControllerGetYieldsParams } from "@yieldxyz/sdk"

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

export type YieldxyzProvider = {
  id: string
  name: string
  logoURI: string
  description: string
  website: string
  tvlUsd: object | null
  type: "protocol" | "validator_provider"
  references: string[]
}

export type YieldxyzPosition = {
  yieldId: string
  networkId: NetworkId
  address: Address
  balances: BalanceDto[]
}

// Simplified yield position with validator grouping
export type YieldxyzPositionEnhanced = YieldxyzPosition & {
  // Validator address if applicable
  validatorAddress?: string
  // Display-ready fields
  displayName: string
  totalAmountUsd: number
  product: YieldDto
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
  "pri(yieldxyz.products.subscribe)": [null, boolean, YieldxyzOpportunitiesResponse]
  "pri(yieldxyz.providers.subscribe)": [null, boolean, YieldxyzProvidersResponse]
}
