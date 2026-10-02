import { isNetworkKnown, type Network, type Token } from "@talismn/chaindata-provider"

import { networkIdForAnalytics, savedNetworkId, tokenSymbolForAnalytics } from "./funds"

const PRIVATE_SUFFIXES = [".local", ".lan", ".home", ".internal", ".localhost", ".onion", ".arpa"]

const COUNTRY_SECOND_LEVELS: ReadonlySet<string> = new Set([
  "co",
  "com",
  "net",
  "org",
  "ac",
  "gov",
  "edu",
])

const RPC_PROTOCOLS = ["http:", "https:", "ws:", "wss:"]

export const isPrivateHost = (host: string): boolean =>
  host === "localhost" ||
  host.startsWith("[") ||
  /^\d+(\.\d+){3}$/.test(host) ||
  PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix))

export const toRpcProvider = (url: string | null | undefined): string | null => {
  if (!url) return null
  let host: string
  try {
    const parsed = new URL(url)
    if (!RPC_PROTOCOLS.includes(parsed.protocol)) return null
    host = parsed.hostname.toLowerCase().replace(/\.+$/, "")
  } catch {
    return null
  }
  if (isPrivateHost(host)) return null

  const labels = host.split(".").filter(Boolean)
  if (labels.length < 2) return null
  const tld = labels[labels.length - 1]
  const second = labels[labels.length - 2]
  const keep = tld.length === 2 && COUNTRY_SECOND_LEVELS.has(second) && labels.length >= 3 ? 3 : 2
  return labels.slice(-keep).join(".")
}

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
