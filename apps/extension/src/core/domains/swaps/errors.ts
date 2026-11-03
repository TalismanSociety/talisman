/** The provider cannot take the swap right now: paused, migrating, a closed lane, a full rate limit */
export class SwapProviderUnavailableError extends Error {
  readonly name = "SwapProviderUnavailableError"
}

/** The provider quoted a route it cannot build a transaction for: its own simulation of the route reverts */
export class SwapRouteUnbuildableError extends Error {
  readonly name = "SwapRouteUnbuildableError"
}
