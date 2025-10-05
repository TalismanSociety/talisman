/**
 * Maps network platform and chain ID to Yield.xyz compatible network names
 */
export function mapToYieldNetwork(platform: string, chainId: string): string {
  if (platform === "ethereum") {
    switch (chainId) {
      case "1":
        return "ethereum"
      case "8453":
        return "base"
      default:
        // Fallback to platform for unknown EVM chains until expanded
        return platform
    }
  }

  return platform
}

/**
 * Maps a network object to Yield.xyz compatible network name
 */
export function mapNetworkToYieldNetwork(
  network: { platform: string; id: string } | null | undefined,
): string | null {
  if (!network) return null
  return mapToYieldNetwork(network.platform, network.id)
}
