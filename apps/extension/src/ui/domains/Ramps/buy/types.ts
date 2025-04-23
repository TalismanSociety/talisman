import { UseQueryResult } from "@tanstack/react-query"

import { RampsProvider } from "../shared/types"

export type RampsBuyQuoteOptions = {
  currencyCode: string
  tokenId: string
  amount: number
}

export type RampsBuyQuoteError = {
  type: "error"
  message: string
  description?: string
}

export type RampsBuyQuoteSuccess = {
  type: "success"
  amountOut: string
  fee: number
  getRedirectUrl: (address: string) => string | Promise<string> // TODO remove string ?
}

export type RampsBuyQuote = RampsBuyQuoteError | RampsBuyQuoteSuccess

export type RampsBuyQuoteQuery = {
  provider: RampsProvider
  query: UseQueryResult<RampsBuyQuote | null, Error>
}
