import type { TokenList } from "@talismn/chaindata-provider"
import { fetchDTaoTokenRates, type TokenRatesList } from "@talismn/token-rates"

import { chainConnector } from "../../rpcs/chain-connector"
import { BITTENSOR_NETWORK_ID } from "../bittensor/constants"
import { TAO_DATA_API_URL } from "../bittensor/tao-data/exports"
import { gandalfFetch } from "../gandalf/fetch"

/**
 * Rates entries for the bittensor dtao (subnet alpha) tokens of `tokens` — thin host glue
 * around @talismn/token-rates' fetchDTaoTokenRates (never throws, keep-last on failure).
 *
 * `tokens` is expected to be pre-filtered on active networks: dtao tokens only show up here
 * when the bittensor network is active, so no gating is needed before hitting its RPC.
 */
export const fetchDTaoTokenRatesForWallet = (
  tokens: TokenList,
  tokenRates: TokenRatesList,
  previousRates: TokenRatesList
): Promise<TokenRatesList> =>
  fetchDTaoTokenRates({
    connector: chainConnector,
    networkId: BITTENSOR_NETWORK_ID,
    tokens,
    tokenRates,
    previousRates,
    customFetch: gandalfFetch,
    taoDataApiUrl: TAO_DATA_API_URL,
  })
