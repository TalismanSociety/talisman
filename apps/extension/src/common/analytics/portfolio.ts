/** Mobile's `SearchSurface` names where the surface is the same, plus the extension's own. */
export const SEARCH_SURFACES = [
  "portfolio_tokens",
  "portfolio_nfts",
  "portfolio_network_filter",
] as const
export type SearchSurface = (typeof SEARCH_SURFACES)[number]

/** Mobile's `account_switched` selections. */
export const ACCOUNT_SELECTIONS = ["account", "folder", "all"] as const
