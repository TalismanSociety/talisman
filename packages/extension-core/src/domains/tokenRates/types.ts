import { TokenRatesStorage } from "@talismn/token-rates"

export interface TokenRatesMessages {
  // tokenRates message signatures
  "pri(tokenRates.subscribe)": [null, boolean, TokenRatesStorage]
}
