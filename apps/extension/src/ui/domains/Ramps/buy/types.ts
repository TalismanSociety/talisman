import { UseQueryResult } from "@tanstack/react-query"

import { RampsProvider, RampsQuoteError } from "../shared/types"

export type RampsBuyQuoteOptions = {
  currencyCode: string
  tokenId: string
  amount: number
}

export type RampsBuyQuoteSuccess = {
  type: "success"
  amountOut: string
  fee: number
  getRedirectUrl: (address: string) => string | Promise<string>
}

export type RampsBuyQuote = RampsQuoteError | RampsBuyQuoteSuccess

export type RampsBuyQuoteQuery = {
  provider: RampsProvider
  query: UseQueryResult<RampsBuyQuote | null, Error>
}
