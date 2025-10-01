export type YieldProduct = {
  id: string
  network: string
  inputTokens: Array<{
    address?: string
    symbol: string
    name: string
    decimals: number
    logoURI: string
    coinGeckoId?: string
    network: string
    isPoints: boolean
  }>
  token: {
    symbol: string
    name: string
    decimals: number
    logoURI: string
    coinGeckoId?: string
    network: string
    isPoints: boolean
  }
  rewardRate: {
    total: number
    rateType: string
    components: Array<{
      rate: number
      rateType: string
      token: {
        symbol: string
        name: string
        decimals: number
        logoURI: string
        coinGeckoId?: string
        network: string
        isPoints: boolean
      }
      yieldSource: string
      description: string
    }>
  }
  status: {
    enter: boolean
    exit: boolean
  }
  metadata: {
    name: string
    description: string
    documentation?: string
    logoURI: string
    underMaintenance: boolean
    deprecated: boolean
    supportedStandards: string[]
  }
  mechanics: {
    type: string
    requiresValidatorSelection: boolean
    rewardSchedule: string
    rewardClaiming: string
    gasFeeToken: {
      symbol: string
      name: string
      decimals: number
      logoURI: string
      coinGeckoId?: string
      network: string
      isPoints: boolean
    }
    cooldownPeriod?: {
      seconds: number
    }
    entryLimits: {
      minimum: string
      maximum: string | null
    }
    supportsLedgerWalletApi: boolean
    arguments: {
      enter: {
        fields: Array<{
          name: string
          type: string
          label: string
          description: string
          required: boolean
          placeholder: string
          minimum?: string
          maximum?: string | null
          isArray: boolean
          options?: string[]
        }>
      }
      exit: {
        fields: Array<{
          name: string
          type: string
          label: string
          description: string
          required: boolean
          placeholder: string
          minimum?: string
          maximum?: string | null
          isArray: boolean
        }>
      }
    }
    possibleFeeTakingMechanisms: {
      depositFee: boolean
      managementFee: boolean
      performanceFee: boolean
      validatorRebates: boolean
    }
  }
  providerId: string
  outputToken: {
    address: string
    symbol: string
    name: string
    decimals: number
    logoURI: string
    network: string
    isPoints: boolean
  }
  statistics?: {
    tvlUsd: string
    tvl: string
    uniqueUsers: string | null
    averagePositionSizeUsd: string | null
    averagePositionSize: string | null
  }
  tags: string[]
}

export type YieldProductsFilter = {
  tokenId?: string
  tokenSymbol?: string
  networkName?: string
  protocolIds?: string[]
}

// API Request/Response Types
export interface YieldEnterRequest {
  yieldId: string
  address: string
  arguments: {
    amount: string
    [key: string]: string | number | boolean | string[] | undefined
  }
}

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

export interface YieldEnterResponse {
  id: string
  intent: string
  type: string
  yieldId: string
  address: string
  amount: string
  amountRaw: string
  amountUsd: string
  transactions: YieldTransaction[]
  executionPattern: "synchronous" | "asynchronous"
  rawArguments: Record<string, string | number | boolean | string[] | undefined>
  createdAt: string
  completedAt?: string
  status: "PENDING" | "CONFIRMED" | "FAILED" | "CANCELED" | "CREATED"
}

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

export interface YieldPositionBalance {
  address: string
  amount: string
  amountRaw: string
  type: string
  token: YieldToken
  pendingActions: unknown[]
  amountUsd: string
  isEarning: boolean
}

export interface YieldPositionItem {
  yieldId: string
  balances: YieldPositionBalance[]
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
