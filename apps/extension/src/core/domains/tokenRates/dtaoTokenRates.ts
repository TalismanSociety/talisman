import type { TokenList } from "@talismn/chaindata-provider"
import { fetchDTaoTokenRates, type TokenRatesList } from "@talismn/token-rates"

import { chainConnector } from "../../rpcs/chain-connector"
import { BITTENSOR_NETWORK_ID, BITTENSOR_NETWORK_IDS } from "../bittensor/constants"
import { TAO_DATA_API_URL } from "../bittensor/tao-data/exports"
import { gandalfFetch } from "../gandalf/fetch"

/**
 * Rates entries for the bittensor dtao (subnet alpha) tokens of `tokens` — thin host glue
 * around @talismn/token-rates' fetchDTaoTokenRates (never throws, keep-last on failure).
 *
 * `tokens` is expected to be pre-filtered on active networks: dtao tokens only show up here
 * when a bittensor network is active, so no gating is needed before hitting its RPC.
 *
 * The tao-data api only has mainnet data: testnet skips the 24h-change fetch, and its alpha
 * tokens stay unpriced anyway (no coingecko rate for the testnet native token to derive from).
 */
export const fetchDTaoTokenRatesForWallet = async (
  tokens: TokenList,
  tokenRates: TokenRatesList,
  previousRates: TokenRatesList
): Promise<TokenRatesList> => {
  const results = await Promise.all(
    BITTENSOR_NETWORK_IDS.map((networkId) =>
      fetchDTaoTokenRates({
        connector: chainConnector,
        networkId,
        tokens,
        tokenRates,
        previousRates,
        customFetch: gandalfFetch,
        taoDataApiUrl: networkId === BITTENSOR_NETWORK_ID ? TAO_DATA_API_URL : null,
      })
    )
  )
  return Object.assign({}, ...results)
}
