import { DbTokenRates } from "@talismn/token-rates"

export interface TokenRatesMessages {
  // tokenRates message signatures
  "pri(tokenRates.subscribe)": [null, boolean, DbTokenRates[]]
}
