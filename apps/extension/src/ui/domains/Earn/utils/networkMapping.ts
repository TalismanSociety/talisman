import { Networks } from "extension-core"

/**
 * Mapping of chain IDs to Yield.xyz network names
 * This data is sourced from Yield.xyz's supported networks list
 * @deprecated DOT NOT USE
 */
const yieldNetworkMapping: Record<string, string> = {
  "1": "ethereum",
  "8453": "base",
  "137": "polygon",
  "42161": "arbitrum",
  "10": "optimism",
  "100": "gnosis",
  "43114": "avalanche-c",
  "56": "binance",
  "250": "fantom",
  "42220": "celo",
  "1285": "moonriver",
  "1666600000": "harmony",
  "66": "okc",
  "1116": "core",
  "146": "sonic",
  "1807": "katana",
  "polkadot": "polkadot",
  "kusama": "kusama",
  "westend": "westend",
  "solana": "solana",
  "near": "near",
  "cardano": "cardano",
  "stellar": "stellar",
  "tezos": "tezos",
  "tron": "tron",
  "ton": "ton",
}

/**
 * Maps network platform and chain ID to Yield.xyz compatible network names
 * Uses dynamic mapping from Yield.xyz supported networks
 * @deprecated DOT NOT USE
 * @param platform - The network platform (e.g., 'ethereum', 'polkadot', 'solana')
 * @param chainId - The chain ID as a string (e.g., '1', '8453')
 * @returns The Yield.xyz compatible network name, or null if not supported
 */
export function mapToYieldNetwork(platform: Networks, chainId: string): Networks | null {
  // For EVM networks, use the mapping from chaindata
  if (platform === "ethereum") {
    const yieldNetwork = yieldNetworkMapping[chainId]
    return (yieldNetwork as Networks) || null
  }

  // For other platforms (polkadot, solana, etc.), check if they're supported
  const yieldNetwork = yieldNetworkMapping[platform]
  return (yieldNetwork as Networks) || null
}

/**
 * Maps a network object to Yield.xyz compatible network name
 * @deprecated DOT NOT USE
 * @param network - The network object with platform and id properties
 * @returns The Yield.xyz compatible network name, or null if network is not available
 */
export function mapNetworkToYieldNetwork(
  network: { platform: Networks; id: string } | null | undefined,
): Networks | null {
  if (!network) {
    return null
  }

  return mapToYieldNetwork(network.platform, network.id)
}

/**
 * Maps Yield.xyz network name to network ID
 * @deprecated DOT NOT USE
 * @param yieldNetwork - The Yield.xyz network name (e.g., 'ethereum', 'base')
 * @returns The network ID as a string, or undefined if not supported
 */
export function mapYieldNetworkToNetworkId(yieldNetwork?: string): string | undefined {
  switch (yieldNetwork) {
    case "ethereum":
      return "1"
    case "base":
      return "8453"
    case "arbitrum":
      return "42161"
    case "optimism":
      return "10"
    case "polygon":
      return "137"
    case "gnosis":
      return "100"
    case "avalanche-c":
      return "43114"
    case "binance":
      return "56"
    case "fantom":
      return "250"
    case "celo":
      return "42220"
    case "moonriver":
      return "1285"
    case "harmony":
      return "1666600000"
    case "okc":
      return "66"
    case "core":
      return "1116"
    case "sonic":
      return "146"
    case "katana":
      return "1807"
    case "polkadot":
      return "polkadot"
    case "kusama":
      return "kusama"
    case "westend":
      return "westend"
    case "solana":
      return "solana-mainnet"
    case "near":
      return "near"
    case "cardano":
      return "cardano"
    case "stellar":
      return "stellar"
    case "tezos":
      return "tezos"
    case "tron":
      return "tron"
    case "ton":
      return "ton"
    default:
      return yieldNetwork
  }
}
