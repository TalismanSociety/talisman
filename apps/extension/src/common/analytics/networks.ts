import { isNetworkKnown, type Network, type Token } from "@talismn/chaindata-provider"

import { networkIdForAnalytics, savedNetworkId, tokenSymbolForAnalytics } from "./funds"

type ToggleSource = "dapp" | "settings"

export const networkToggledOf = (network: Network, enabled: boolean, source: ToggleSource) => ({
  network_id: savedNetworkId(network, isNetworkKnown(network)),
  platform: network.platform,
  enabled,
  default_enabled: !!network.isDefault && !network.isTestnet,
  source,
})

export const tokenToggledOf = (
  token: Token,
  network: Network | null | undefined,
  enabled: boolean,
  source: ToggleSource
) => ({
  network_id: networkIdForAnalytics(network),
  token_symbol: tokenSymbolForAnalytics(token),
  enabled,
  default_enabled: !!token.isDefault,
  source,
})
