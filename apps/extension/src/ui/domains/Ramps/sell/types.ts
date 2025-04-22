import { UseQueryResult } from "@tanstack/react-query"

import { RampProvider } from "../shared/types"

export type RampsSellQuoteOptions = {
  currencyCode: string
  tokenId: string
  amount: number
}

export type RampsSellQuoteError = {
  type: "error"
  message: string
  description?: string
}

export type RampsSellQuoteSuccess = {
  type: "success"
  amountOut: number
  fee: number
  tokenPrice: number
  getRedirectUrl: (address: string) => string | Promise<string> // TODO remove string ?
}

export type RampsSellQuote = RampsSellQuoteError | RampsSellQuoteSuccess

export type RampsSellQuoteQuery = {
  provider: RampProvider
  query: UseQueryResult<RampsSellQuote | null, Error>
}
