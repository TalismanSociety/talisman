export const SEARCH_SURFACES = [
  "portfolio_tokens",
  "portfolio_nfts",
  "portfolio_network_filter",
] as const
export type SearchSurface = (typeof SEARCH_SURFACES)[number]

export const ACCOUNT_SELECTIONS = ["account", "folder", "all"] as const
