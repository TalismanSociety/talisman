import { UseQueryResult } from "@tanstack/react-query"

import { RampsProvider, RampsQuoteError } from "../shared/types"

export type RampsSellQuoteOptions = {
  currencyCode: string
  tokenId: string
  amount: number
}

export type RampsSellQuoteSuccess = {
  type: "success"
  amountOut: number
  fee: number
  tokenPrice: number
  getRedirectUrl: (address: string) => string | Promise<string> // TODO remove string ?
}

export type RampsSellQuote = RampsQuoteError | RampsSellQuoteSuccess

export type RampsSellQuoteQuery = {
  provider: RampsProvider
  query: UseQueryResult<RampsSellQuote | null, Error>
}
