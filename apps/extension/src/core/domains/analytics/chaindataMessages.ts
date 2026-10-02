import {
  networkIdForAnalytics,
  savedNetworkId,
  tokenSymbolForAnalytics,
} from "@common/analytics/funds"
import { toRpcProvider } from "@common/analytics/networks"
import { isNetworkKnown } from "@talismn/chaindata-provider"

import { chaindataProvider } from "../../rpcs/chaindata"
import type { MessageTypes, RequestTypes } from "../../types"
import { track } from "./track"

type ChaindataMessage =
  | "pri(chaindata.networks.upsert)"
  | "pri(chaindata.networks.remove)"
  | "pri(chaindata.tokens.upsert)"
  | "pri(chaindata.tokens.remove)"

type Observe<M extends ChaindataMessage> = (request: RequestTypes[M]) => () => Promise<void>

const networkOf = (networkId: string) => chaindataProvider.getNetworkById(networkId)

const CHAINDATA_MESSAGES: { [M in ChaindataMessage]: Observe<M> } = {
  "pri(chaindata.networks.upsert)": ({ network }) => {
    const before = networkOf(network.id)
    return async () => {
      const existing = await before
      track("custom_network_saved", {
        mode: existing ? "edit" : "add",
        platform: network.platform,
        network_id: savedNetworkId(network, !!existing && isNetworkKnown(existing)),
        testnet: !!network.isTestnet,
        rpc_provider: toRpcProvider(network.rpcs[0]),
        source: "settings",
      })
    }
  },
  "pri(chaindata.networks.remove)": ({ id }) => {
    const before = networkOf(id)
    return async () => {
      const network = await before
      if (network)
        track("custom_network_deleted", {
          network_id: savedNetworkId(network, isNetworkKnown(network)),
          platform: network.platform,
        })
    }
  },
  "pri(chaindata.tokens.upsert)": (token) => {
    const before = chaindataProvider.getTokenById(token.id)
    const network = networkOf(token.networkId)
    return async () => {
      const [existing, tokenNetwork] = await Promise.all([before, network])
      const networkId = networkIdForAnalytics(tokenNetwork)
      const tokenSymbol = tokenSymbolForAnalytics(existing)
      if (existing)
        track("custom_token_edited", { network_id: networkId, token_symbol: tokenSymbol })
      else
        track("custom_token_added", {
          network_id: networkId,
          token_symbol: tokenSymbol,
          has_coingecko_id: !!token.coingeckoId,
          source: "settings",
        })
    }
  },
  "pri(chaindata.tokens.remove)": ({ id }) => {
    const before = chaindataProvider.getTokenById(id)
    return async () => {
      const token = await before
      if (token)
        track("custom_token_deleted", {
          network_id: networkIdForAnalytics(await networkOf(token.networkId)),
        })
    }
  },
}

const isChaindataMessage = (type: MessageTypes): type is ChaindataMessage =>
  Object.hasOwn(CHAINDATA_MESSAGES, type)

export const observeChaindataMessage = (
  type: MessageTypes,
  request: unknown
): (() => Promise<void>) | null => {
  if (!isChaindataMessage(type)) return null
  const observe = CHAINDATA_MESSAGES[type] as unknown as (request: unknown) => () => Promise<void>
  return observe(request)
}
