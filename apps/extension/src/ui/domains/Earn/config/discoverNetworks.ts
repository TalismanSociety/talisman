/**
 * Predefined list of networks for the "Discover opportunities" section
 * These networks will be used to fetch yield products for discovery
 */
export const DISCOVER_NETWORKS = [
  "polkadot",
  "kusama",
  "ethereum",
  "arbitrum",
  "moonbeam",
  "astar",
  "acala",
  "karura",
  "bifrost",
  "hydradx",
] as const

export type DiscoverNetwork = (typeof DISCOVER_NETWORKS)[number]
