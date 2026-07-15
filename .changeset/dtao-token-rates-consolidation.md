---
"@talismn/token-rates": minor
"@talismn/balances": minor
---

Consolidate bittensor dtao (subnet alpha) token pricing into the token-rates layer

- `@talismn/token-rates`: new `getDTaoTokenRates` — computes a subnet alpha token's rates from the network's TAO rates scaled by the subnet pool price (moved from `@talismn/balances`)
- `@talismn/balances`: dtao pricing removed from the balances layer — `Balance.rates` resolves dtao tokens from the hydrated tokenRates list like any other token; `scaledAlphaPrice` is no longer fetched per poll nor stamped on balance meta (balances stay reference-stable across pool price moves); `SubDTaoBalanceMeta` narrowed to `{ convictionLock? }`; `getDTaoTokenRates` and `getScaledAlphaPrice` exports removed; `calculatePendingRootClaimable` loses its price param
