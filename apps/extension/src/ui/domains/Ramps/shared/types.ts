export type RampsMode = "buy" | "sell"

export type RampsProvider = "ramp" | "coinbase"

export type RampsFormSharedData = {
  currencyCode?: string
  tokenId?: string
}

export type RampsQuoteError = {
  type: "error"
  message: string
  description?: string
}
