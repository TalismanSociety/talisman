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
