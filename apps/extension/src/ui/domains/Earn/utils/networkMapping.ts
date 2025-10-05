/**
 * Maps network platform and chain ID to Yield.xyz compatible network names
 *
 * @param platform - The network platform (e.g., 'ethereum', 'polkadot', 'solana')
 * @param chainId - The chain ID as a string (e.g., '1', '8453')
 * @returns The Yield.xyz compatible network name
 * @throws Error if the chain ID is not supported for the given platform
 */
export function mapToYieldNetwork(platform: string, chainId: string): string {
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
  network: { platform: string; id: string } | null | undefined,
): string | null {
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
    default:
      return undefined
  }
}
