import { Token } from "@talismn/chaindata-provider"

import { AccountJsonAny, EvmNetwork } from "@extension/core"
import { AnyChain } from "@ui/state"

export type RampCurrency = {
  fiatCurrency: string
  name: string
  onrampAvailable: boolean
  offrampAvailable: boolean
}

type AssetPrice = Record<string, number>

export type RampAsset = {
  address: string
  symbol: string
  chain: string
  name: string
  decimals: number
  type: string
  enabled: boolean
  logoUrl: string
  hidden: boolean
  networkFee: number
  price: AssetPrice
  currencyCode: string
  minPurchaseAmount: number
  maxPurchaseAmount: number
  minPurchaseCryptoAmount: string
}

export type RampCurrencyWithAssets = {
  currencyCode: string
  minPurchaseAmount: number
  maxPurchaseAmount: number
  minFeeAmount: number
  minFeePercent: number
  maxFeePercent: number
  assets: RampAsset[]
}

type PaymentMethod = {
  fiatCurrency: string
  cryptoAmount: string
  fiatValue: number
  baseRampFee: number
  appliedFee: number
}

export type RampQuote = {
  CARD_PAYMENT?: PaymentMethod
  APPLE_PAY?: PaymentMethod
  CARD?: PaymentMethod
  AMERICAN_BANK_TRANSFER?: PaymentMethod
  asset: RampAsset
}

export type RampAssetWithTokenAndChain = RampAsset & {
  tokenData: {
    chain: AnyChain | EvmNetwork | undefined
    token: Token
    id: string
  }
}

export type FormRoute = "mainForm" | "pickFiat" | "pickToken" | "pickWallet"

export type RampTokenAsset = {
  id: string
  symbol: string
  chain: string
  chainPrefix?: number | null | undefined
  chainId: string
  chainName?: string
  logo?: string
  decimals: number
  isEvm: boolean
  minPurchaseAmount: number
}

export type FormData = {
  address: string
  fiatAmount: number
  fiatCurrency: string
  tokenAmount: number
  dirtyAmountField: string
  rampTokenAsset: RampTokenAsset
}

export type AccountWithBalance = AccountJsonAny & { total: number; balance?: undefined }
