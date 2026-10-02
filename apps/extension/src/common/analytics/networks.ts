const PRIVATE_SUFFIXES = [".local", ".lan", ".home", ".internal", ".localhost", ".onion", ".arpa"]

/** Second-level labels under a country TLD that belong to the public suffix (`co.uk`). */
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

/**
 * Mobile's `rpc_provider`: the registrable domain of an RPC URL, `https://eth-mainnet.g.alchemy.com/v2/<key>`
 * reads `alchemy.com`. Paths carry API keys and subdomains carry customer names, so both stay on the
 * device. A self-hosted node reads null.
 */
export const toRpcProvider = (url: string | null | undefined): string | null => {
  if (!url) return null
  let host: string
  try {
    const parsed = new URL(url)
    if (!RPC_PROTOCOLS.includes(parsed.protocol)) return null
    host = parsed.hostname.toLowerCase()
  } catch {
    return null
  }
  if (host === "localhost" || host.startsWith("[") || /^\d+(\.\d+){3}$/.test(host)) return null
  if (PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix))) return null

  const labels = host.split(".").filter(Boolean)
  if (labels.length < 2) return null
  const tld = labels[labels.length - 1]
  const second = labels[labels.length - 2]
  const keep = tld.length === 2 && COUNTRY_SECOND_LEVELS.has(second) && labels.length >= 3 ? 3 : 2
  return labels.slice(-keep).join(".")
}
