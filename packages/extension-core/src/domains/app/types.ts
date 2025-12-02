import { DotNetworkId, EthNetworkId, TokenId } from "@talismn/chaindata-provider"

import { ValidRequests } from "../../libs/requests/types"
import { Address } from "../../types/base"
import { PostHogCaptureProperties } from "../analytics/types"

export type RemoteConfigStoreData = {
  featureFlags: FeatureFlags
  ramps: {
    coinbaseProjectId: string
    pinnedTokens: TokenId[]
    rampNetworks: Record<string, string> // maps a Ramp network ID to an NetworkId
  }
  swaps: {
    questApi?: string
    lifiTalismanTokens?: string[]
    lifiCustomFeeTokens?: Record<string, number>
    simpleswapApiKey?: string
    simpleswapApiKeyDiscounted?: string
    simpleswapDiscountedCurrencies?: string[]
    curatedTokens?: string[]
    promotedBuyTokens?: string[]
    promotedSellTokens?: string[]
  }
  coingecko: {
    apiUrl: string
    apiKeyName?: string
    apiKeyValue?: string
  }
  coinsApi?: {
    apiUrl: string
  }
  nominationPools: Record<DotNetworkId, number[]>
  stakingPools: Record<DotNetworkId | EthNetworkId, (number | string)[]>
  postHogUrl: string
  documentation: {
    unifiedAddressDocsUrl: string
  }
  recommendedNetworks?: string[] // sorted ids of most famous networks, sort others alphabetically
  seek: {
    tokenId: string
    stakingUrl: string
    docsUrl: string
    tradeUrl: string
    stakingContractNetworkId: string
    stakingContractAddress: `0x${string}`
    stakingEarlyRewardBoost: string
    webAppStakingPath: string
    discountTiers: Array<{
      tier: number
      min: string
      discount: number
    }>
  }
  bittensor: {
    fee: {
      buy: Record<number, number>
      sell: Record<number, number>
    }
  }
}

export interface RequestOnboardCreatePassword {
  pass: string
  passConfirm: string
}

export interface RequestLogin {
  pass: string
}

export interface RequestRoute {
  route: string
}

export type SendFundsOpenRequest = {
  from?: Address
  tokenId?: TokenId
  tokenSymbol?: string
  to?: Address
}

export interface AnalyticsCaptureRequest {
  eventName: string
  options?: PostHogCaptureProperties
}

// values must match the flags defined in config repository
export type FeatureFlags = Partial<{
  BUY_CRYPTO: boolean
  LINK_STAKING: boolean
  RISK_ANALYSIS_V2: boolean
  NEW_FEATURES_HOME_BANNER: boolean
  SWAPS: boolean
  QUEST_LINK: boolean
  UNIFIED_ADDRESS_BANNER: boolean
  NFTS_V2: boolean
  SEEK_BENEFITS: boolean
  SEEK_TAO_DISCOUNT: boolean
  SEEK_PRESALE: boolean
  ASSET_HUB_MIGRATION_BANNER: boolean
}>
export type FeatureFlag = keyof FeatureFlags

type FALSE = "FALSE"
type TRUE = "TRUE"
type UNKNOWN = "UNKNOWN"

type StringTernary = FALSE | TRUE | UNKNOWN

export type OnboardedType = StringTernary
export type LoggedinType = StringTernary

export type ChangePasswordRequest = {
  currentPw: string
  newPw: string
  newPwConfirm: string
}
export const ChangePasswordStatusUpdateStatus = {
  VALIDATING: "VALIDATING",
  PREPARING: "PREPARING",
  MNEMONICS: "MNEMONICS",
  KEYPAIRS: "KEYPAIRS",
  AUTH: "AUTH",
  DONE: "DONE",
  ERROR: "ERROR",
} as const

export type ChangePasswordStatusUpdateType =
  (typeof ChangePasswordStatusUpdateStatus)[keyof typeof ChangePasswordStatusUpdateStatus]

export type ChangePasswordStatusUpdate = {
  status: ChangePasswordStatusUpdateType
  message?: string
}

export interface CheckPasswordRequest {
  password: string
}

export interface RequestAllowPhishingSite {
  url: string
}

export interface AppMessages {
  "pri(app.onboardCreatePassword)": [RequestOnboardCreatePassword, boolean]
  "pri(app.authenticate)": [RequestLogin, boolean]
  "pri(app.authStatus)": [null, LoggedinType]
  "pri(app.authStatus.subscribe)": [null, boolean, LoggedinType]
  "pri(app.lock)": [null, boolean]
  "pri(app.changePassword)": [ChangePasswordRequest, boolean]
  "pri(app.changePassword.subscribe)": [ChangePasswordRequest, boolean, ChangePasswordStatusUpdate]
  "pri(app.checkPassword)": [CheckPasswordRequest, boolean]
  "pri(app.dashboardOpen)": [RequestRoute, boolean]
  "pri(app.onboardOpen)": [null, boolean]
  "pri(app.popupOpen)": [string | undefined, boolean]
  "pri(app.sendFunds.open)": [SendFundsOpenRequest, boolean]
  "pri(app.promptLogin)": [null, boolean]
  "pri(app.analyticsCapture)": [AnalyticsCaptureRequest, boolean]
  "pri(app.phishing.addException)": [RequestAllowPhishingSite, boolean]
  "pri(app.resetWallet)": [null, boolean]
  "pri(app.requests)": [null, boolean, ValidRequests[]]
}
