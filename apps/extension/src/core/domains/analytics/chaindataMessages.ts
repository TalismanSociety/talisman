import { networkIdForAnalytics } from "@common/analytics/funds"
import { savedNetworkId, toRpcProvider } from "@common/analytics/networks"
import { symbolForAnalytics } from "@common/analytics/schema"
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

/**
 * Only the settings pages send these. Each reads chaindata when the message arrives, before the
 * handler changes it: what was there decides between an add and an edit.
 */
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
      const tokenSymbol = symbolForAnalytics(token.symbol)
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

/** Null when the message is not a network or token change from settings. */
export const observeChaindataMessage = (
  type: MessageTypes,
  request: unknown
): (() => Promise<void>) | null => {
  if (!isChaindataMessage(type)) return null
  // each entry only ever receives its own message's request
  const observe = CHAINDATA_MESSAGES[type] as unknown as (request: unknown) => () => Promise<void>
  return observe(request)
}
