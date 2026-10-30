/** The provider cannot take the swap right now: paused, migrating, a closed lane, a full rate limit */
export class SwapProviderUnavailableError extends Error {
  readonly name = "SwapProviderUnavailableError"
}
