import { ActionDto, BalanceDto, CreateActionDto, YieldBalancesDto, YieldDto } from "@yieldxyz/sdk"

import { YieldPositionGroup } from "./groupYieldBalances"

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
} from "@yieldxyz/sdk"

export type YieldProductsFilter = {
  tokenId?: string
  tokenSymbol?: string
  networkName?: string
  protocolIds?: string[]
  yieldIds?: string[]
}

// API Request/Response Types - using SDK types
export type YieldEnterRequest = CreateActionDto

export interface YieldTransaction {
  id: string
  title: string
  network: string
  status: "PENDING" | "CONFIRMED" | "FAILED" | "SKIPPED" | "BROADCASTED" | "CREATED"
  type: string
  hash?: string
  createdAt: string
  broadcastedAt?: string
  signedTransaction?: string
  unsignedTransaction: string
  annotatedTransaction: {
    method: string
    inputs: Record<string, string | number | boolean | string[] | undefined>
  }
  structuredTransaction: Record<string, unknown>
  stepIndex: number
  description: string
  error?: string
  gasEstimate:
    | string
    | {
        amount: string
        gasLimit: string
        token: {
          network: string
          name: string
          symbol: string
          decimals: number
          coinGeckoId: string
          logoURI: string
        }
      }
  explorerUrl?: string
  isMessage: boolean
}

export type YieldEnterResponse = ActionDto

export interface YieldSubmitHashRequest {
  hash: string
}

export interface YieldBalanceQuery {
  address: string
  network: string
}

export interface YieldValidator {
  address: string
  preferred: boolean
  name: string
  logoURI: string
  website?: string
  commission?: number
  votingPower?: number
  nominatorCount?: number
  status: "active" | "inactive"
  providerId?: string
  tvl: string
  provider?: {
    id: string
    createdAt: string
    updatedAt: string
    name: string
    uniqueId: string
    website: string
    rank: number
    preferred: boolean
    revshare: {
      pro: { maxRevShare: number; minRevShare: number }
      trial: { maxRevShare: number; minRevShare: number }
      standard: { maxRevShare: number; minRevShare: number }
    }
  }
  rewardRate: {
    total: number
    rateType: "APR" | "APY"
    components: unknown[]
  }
}

export interface YieldValidatorsResponse {
  items: YieldValidator[]
}

export interface YieldBalanceRequest {
  queries: YieldBalanceQuery[]
}

export interface YieldToken {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI: string
  coinGeckoId: string
  network: string
  isPoints: boolean
}

export interface YieldPositionItem {
  yieldId: string
  balances: BalanceDto[]
}

export interface YieldError {
  yieldId: string
  error: string
}

export interface YieldBalancesResponse {
  items: YieldPositionItem[]
  errors: YieldError[]
}

export type YieldStatusResponse = YieldTransaction

export interface YieldBalancesDtoWithProduct extends YieldBalancesDto {
  product?: YieldDto
}

// Re-export grouped types
export type { YieldPositionGroup } from "./groupYieldBalances"

// UI subscription response type (store-backed), mirroring DeFi
export type YieldPositionsResponse = import("@talismn/util").Loadable<YieldBalancesDtoWithProduct[]>
export type YieldPositionsGroupedResponse = import("@talismn/util").Loadable<YieldPositionGroup[]>

// Message type augmentation for handler routing
export interface YieldMessages {
  "pri(yield.balances.subscribe)": [null, boolean, YieldPositionsResponse]
  "pri(yield.balances.grouped.subscribe)": [null, boolean, YieldPositionsGroupedResponse]
}
