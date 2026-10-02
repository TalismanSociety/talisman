import { networkIdForAnalytics } from "@common/analytics/funds"
import { networkToggledOf, tokenToggledOf } from "@common/analytics/networks"
import { type ChainPlatform, CUSTOM_NETWORK_ID } from "@common/analytics/transactions"

import { requestStore } from "../../libs/requests/store"
import { chaindataProvider } from "../../rpcs/chaindata"
import type { MessageTypes, RequestTypes } from "../../types"
import sitesAuthorisedStore from "../sitesAuthorised/store"
import type { AuthorisedSiteUpdate, ProviderType } from "../sitesAuthorised/types"
import { track } from "./track"

type DappMessage =
  | "pri(sites.requests.approve)"
  | "pri(sites.requests.approveSolSignIn)"
  | "pri(sites.update)"
  | "pri(sites.forget)"
  | "pri(sites.forget.all)"
  | "pri(sites.disconnect.all)"
  | "pri(eth.networks.add.approve)"
  | "pri(eth.watchasset.requests.approve)"

type Observe<M extends DappMessage> = (request: RequestTypes[M]) => () => Promise<void>

const CONNECTED_ACCOUNTS: Record<"addresses" | "ethAddresses" | "solAddresses", ChainPlatform> = {
  addresses: "polkadot",
  ethAddresses: "ethereum",
  solAddresses: "solana",
}

const PLATFORM_ACCOUNTS: Record<ProviderType, keyof typeof CONNECTED_ACCOUNTS> = {
  polkadot: "addresses",
  ethereum: "ethAddresses",
  solana: "solAddresses",
}

const countSites = async (type: ProviderType) => {
  const sites = await sitesAuthorisedStore.get()
  return Object.values(sites).filter((site) => site[PLATFORM_ACCOUNTS[type]] !== undefined).length
}

const reportSiteUpdate = async (update: AuthorisedSiteUpdate) => {
  for (const [key, platform] of Object.entries(CONNECTED_ACCOUNTS))
    if (key in update)
      track("dapp_connection_updated", {
        platform,
        account_count: update[key as keyof typeof CONNECTED_ACCOUNTS]?.length ?? 0,
      })

  if (update.ethChainId === undefined) return
  const network = await chaindataProvider.getNetworkById(String(update.ethChainId), "ethereum")
  track("dapp_network_switched", { network_id: networkIdForAnalytics(network) })
}

const DAPP_MESSAGES: { [M in DappMessage]: Observe<M> } = {
  "pri(sites.requests.approve)": ({ id, addresses = [] }) => {
    const queued = requestStore.getRequest(id)
    return async () => {
      if (queued)
        track("dapp_connection_approved", {
          method: "connect",
          platform: queued.request.provider,
          account_count: addresses.length,
        })
    }
  },
  "pri(sites.requests.approveSolSignIn)": ({ id }) => {
    const queued = requestStore.getRequest(id)
    return async () => {
      if (queued)
        track("dapp_connection_approved", {
          method: "signIn",
          platform: "solana",
          account_count: 1,
        })
    }
  },
  "pri(sites.update)":
    ({ authorisedSite }) =>
    async () =>
      reportSiteUpdate(authorisedSite),
  "pri(sites.forget)":
    ({ type }) =>
    async () =>
      track("dapp_connection_forgotten", { platform: type }),
  "pri(sites.forget.all)": ({ type }) => {
    const siteCount = countSites(type)
    return async () =>
      track("dapp_connections_forgotten", { platform: type, site_count: await siteCount })
  },
  "pri(sites.disconnect.all)": ({ type }) => {
    const siteCount = countSites(type)
    return async () =>
      track("dapp_connections_disconnected", { platform: type, site_count: await siteCount })
  },
  "pri(eth.networks.add.approve)": ({ id }) => {
    const queued = requestStore.getRequest(id)
    if (!queued) return async () => {}
    const { network } = queued
    const listed = chaindataProvider.getNetworkById(network.id, "ethereum")
    return async () => {
      const known = await listed
      if (known) track("network_toggled", networkToggledOf(known, true, "dapp"))
      else
        track("custom_network_saved", {
          mode: "add",
          platform: "ethereum",
          network_id: CUSTOM_NETWORK_ID,
          testnet: !!network.isTestnet,
          source: "dapp",
        })
    }
  },
  "pri(eth.watchasset.requests.approve)": ({ id }) => {
    const queued = requestStore.getRequest(id)
    if (!queued) return async () => {}
    const { token } = queued
    const listed = chaindataProvider.getTokenById(token.id)
    const network = chaindataProvider.getNetworkById(token.networkId, "ethereum")
    return async () => {
      const [known, tokenNetwork] = await Promise.all([listed, network])
      if (known) track("token_toggled", tokenToggledOf(known, tokenNetwork, true, "dapp"))
      else
        track("custom_token_added", {
          network_id: networkIdForAnalytics(tokenNetwork),
          token_symbol: "unknown",
          has_coingecko_id: !!token.coingeckoId,
          source: "dapp",
        })
    }
  },
}

const isDappMessage = (type: MessageTypes): type is DappMessage =>
  Object.hasOwn(DAPP_MESSAGES, type)

export const observeDappMessage = (
  type: MessageTypes,
  request: unknown
): (() => Promise<void>) | null => {
  if (!isDappMessage(type)) return null
  const observe = DAPP_MESSAGES[type] as unknown as (request: unknown) => () => Promise<void>
  return observe(request)
}
