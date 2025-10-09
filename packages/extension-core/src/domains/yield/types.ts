import { BalanceDto, YieldBalancesDto, YieldDto } from "@yieldxyz/sdk"

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

export interface YieldPositionItem {
  yieldId: string
  balances: BalanceDto[]
}
export interface YieldBalancesDtoWithProduct extends YieldBalancesDto {
  product?: YieldDto
}

export interface YieldPositionGroup {
  yieldId: string
  address: string
  product?: YieldDto

  // Grouped balances by lifecycle type
  activeBalances: BalanceDto[]
  claimableBalances: BalanceDto[]
  otherBalances: BalanceDto[] // entering, exiting, withdrawable, locked

  // Aggregated data
  totalAmountUsd: number
  totalActiveAmountUsd: number
  totalClaimableAmountUsd: number
  totalOtherAmountUsd: number

  // Primary token info (from first active balance)
  primaryToken: BalanceDto["token"]

  // Validator info (support multiple validators)
  validators?: Array<{
    name?: string
    logoURI?: string
    address?: string
  }>

  // Combined pending actions from all balances
  allPendingActions: unknown[]

  // Position status
  isEarning: boolean
  hasClaimableRewards: boolean
  hasOtherBalances: boolean

  // UI-ready calculated fields
  rewardPercentage: number
  displayName: string
  networkId: string
}

// UI subscription response type (store-backed), mirroring DeFi
export type YieldPositionsResponse = import("@talismn/util").Loadable<YieldBalancesDtoWithProduct[]>
export type YieldPositionsGroupedResponse = import("@talismn/util").Loadable<YieldPositionGroup[]>

// Message type augmentation for handler routing
export interface YieldMessages {
  "pri(yield.balances.subscribe)": [null, boolean, YieldPositionsResponse]
  "pri(yield.balances.grouped.subscribe)": [null, boolean, YieldPositionsGroupedResponse]
}
