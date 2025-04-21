import { UseQueryResult } from "@tanstack/react-query"

import { RampProvider } from "../shared/types"

export type RampBuyQuoteOptions = {
  currencyCode: string
  tokenId: string
  amount: number
}

export type RampBuyQuoteError = {
  type: "error"
  message: string
  description?: string
}

export type RampBuyQuoteSuccess = {
  type: "success"
  amountOut: string
  fee: number
  getRedirectUrl: (address: string) => string | Promise<string> // TODO remove string ?
}

export type RampBuyQuote = RampBuyQuoteError | RampBuyQuoteSuccess

export type RampBuyQuoteQuery = {
  provider: RampProvider
  query: UseQueryResult<RampBuyQuote | null, Error>
}
