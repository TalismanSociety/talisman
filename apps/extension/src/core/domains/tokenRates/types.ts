import type { TokenId } from "@talismn/chaindata-provider"
import type { TokenRatesStorage } from "@talismn/token-rates"

export interface TokenRatesMessages {
  // tokenRates message signatures
  "pri(tokenRates.subscribe)": [null, boolean, TokenRatesStorage]
  "pri(tokenRates.registerAdditional)": [TokenId[], boolean]
}
