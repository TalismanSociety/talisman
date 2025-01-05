import { Token } from "@talismn/chaindata-provider"

import { EvmNetwork } from "@extension/core"
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

export type SupportedTokenInfo = {
  id: string
}

export type RampAssetWithTokenAndChain = RampAsset & {
  tokenData: {
    chain: AnyChain | EvmNetwork | undefined
    token: Token
    id: string
  }
}
