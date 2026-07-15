import type { TokenList } from "@talismn/chaindata-provider"
import { fetchDTaoTokenRates, type TokenRatesList } from "@talismn/token-rates"

import { chainConnector } from "../../rpcs/chain-connector"
import { chaindataProvider } from "../../rpcs/chaindata"
import { type ActiveNetworks, isNetworkActive } from "../balances/store.activeNetworks"
import { BITTENSOR_NETWORK_ID } from "../bittensor/constants"
import { gandalfFetch } from "../gandalf/fetch"

/**
 * Rates entries for the bittensor dtao (subnet alpha) tokens of `tokens` — thin host glue
 * around @talismn/token-rates' fetchDTaoTokenRates (never throws, keep-last on failure).
 */
export const fetchDTaoTokenRatesForWallet = async (
  tokens: TokenList,
  tokenRates: TokenRatesList,
  previousRates: TokenRatesList,
  activeNetworks: ActiveNetworks
): Promise<TokenRatesList> => {
  // dtao template tokens are isDefault (always in the active-token list), so gate on the
  // NETWORK's active state too — no bittensor RPC when the user has the network disabled
  const network = await chaindataProvider.getNetworkById(BITTENSOR_NETWORK_ID)
  if (!network || !isNetworkActive(network, activeNetworks)) return {}

  return fetchDTaoTokenRates({
    connector: chainConnector,
    networkId: BITTENSOR_NETWORK_ID,
    tokens,
    tokenRates,
    previousRates,
    customFetch: gandalfFetch,
  })
}
