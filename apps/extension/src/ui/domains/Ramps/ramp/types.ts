export type RampCurrency = {
  fiatCurrency: string
  name: string
  onrampAvailable: boolean
  offrampAvailable: boolean
}

export interface RampHostAssetsConfig {
  assets: RampAssetInfo[]
  enabledFeatures?: string[]

  currencyCode: string
  minPurchaseAmount: number
  maxPurchaseAmount: number
  minFeeAmount: number
  // Final fee percentage depends on the payment method and purchase size.
  minFeePercent: number
  maxFeePercent: number
}

export interface RampAssetInfo {
  // Asset symbol, e.g. ETH, DAI, BTC
  symbol: string
  // Asset chain, e.g. ETH, POLKADOT, RONIN
  chain: string
  // Asset descriptive name, e.g. Ethereum
  name: string
  // Number of decimal places to convert units to whole coins
  decimals: number
  // Asset type -- NATIVE for native assets (e.g. ETH, BTC, ELROND), or a token standard (e.g. ERC20)
  type: string
  // Token contract address, if applicable (if the asset is not the chain native asset)
  address?: string
  logoUrl: string
  enabled: boolean
  hidden: boolean

  // Approximate price of a single whole asset unit (1 ETH/DAI/...) per currency code. Please note that the actual price may vary
  price: Record<string, number>

  currencyCode: string
  // Asset-specific purchase limits, -1 means unlimited (global limits are used)
  minPurchaseAmount: number
  maxPurchaseAmount: number
  minPurchaseCryptoAmount: string // in wei/units
  // Network fee for the asset added on top of Ramp Network's fee
  networkFee: number
}

export interface RampBuyQuoteResult {
  asset: RampAssetInfo
  [RampPaymentMethodName.MANUAL_BANK_TRANSFER]: QuoteResultForPaymentMethod
  [RampPaymentMethodName.AUTO_BANK_TRANSFER]: QuoteResultForPaymentMethod
  [RampPaymentMethodName.CARD_PAYMENT]: QuoteResultForPaymentMethod
  [RampPaymentMethodName.APPLE_PAY]: QuoteResultForPaymentMethod
  [RampPaymentMethodName.GOOGLE_PAY]: QuoteResultForPaymentMethod
  [RampPaymentMethodName.PIX]: QuoteResultForPaymentMethod
  [RampPaymentMethodName.OPEN_BANKING]: QuoteResultForPaymentMethod
}

enum RampPaymentMethodName {
  MANUAL_BANK_TRANSFER = "MANUAL_BANK_TRANSFER",
  AUTO_BANK_TRANSFER = "AUTO_BANK_TRANSFER",
  CARD_PAYMENT = "CARD_PAYMENT",
  APPLE_PAY = "APPLE_PAY",
  GOOGLE_PAY = "GOOGLE_PAY",
  PIX = "PIX",
  OPEN_BANKING = "OPEN_BANKING",
}

export interface QuoteResultForPaymentMethod {
  fiatCurrency: string // three-letter currency code
  cryptoAmount: string // number-string, in wei or token units
  fiatValue: number // total value the user pays for the purchase, in fiatCurrency
  baseRampFee: number // base Ramp Network fee before any modifications, in fiatCurrency
  appliedFee: number // final fee the user pays (included in fiatValue), in fiatCurrency
  hostFeeCut?: number
}
export interface RampSellQuoteResult {
  asset: RampAssetInfo
  [PayoutMethodName.AMERICAN_BANK_TRANSFER]: QuoteResultForPayoutMethod
  [PayoutMethodName.CARD]: QuoteResultForPayoutMethod
  [PayoutMethodName.SEPA]: QuoteResultForPayoutMethod
  [PayoutMethodName.SPEI]: QuoteResultForPayoutMethod
}

enum PayoutMethodName {
  AMERICAN_BANK_TRANSFER = "AMERICAN_BANK_TRANSFER",
  CARD = "CARD",
  SEPA = "SEPA",
  SPEI = "SPEI",
}

interface QuoteResultForPayoutMethod {
  fiatCurrency: string // three-letter currency code
  cryptoAmount: string // number-string, in wei or token units
  fiatValue: number // total fiat value the user receives for the transaction, in fiatCurrency
  baseRampFee: number // base Ramp Network fee before any modifications, in fiatCurrency
  appliedFee: number // final fee the user pays (included in fiatValue), in fiatCurrency
  hostFeeCut?: number
}
