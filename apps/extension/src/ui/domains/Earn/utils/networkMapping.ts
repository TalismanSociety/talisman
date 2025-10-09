import { Networks } from "extension-core"

/**
 * Maps network platform and chain ID to Yield.xyz compatible network names
 *
 * @param platform - The network platform (e.g., 'ethereum', 'polkadot', 'solana')
 * @param chainId - The chain ID as a string (e.g., '1', '8453')
 * @returns The Yield.xyz compatible network name
 * @throws Error if the chain ID is not supported for the given platform
 */
export function mapToYieldNetwork(platform: Networks, chainId: string): Networks {
  if (platform === "ethereum") {
    switch (chainId) {
      case "1":
        return "ethereum" // Ethereum Mainnet
      case "8453":
        return "base" // Base Layer 2
      default:
        throw new Error(`Unsupported Ethereum chain ID: ${chainId}`)
    }
  }

  // For other platforms (polkadot, solana, etc.), return the platform as-is
  return platform
}

/**
 * Maps a network object to Yield.xyz compatible network name
 *
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
 *
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
      return "solana"
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
