---
"@talismn/token-rates": minor
"@talismn/balances": minor
---

Consolidate bittensor dtao (subnet alpha) token pricing into the token-rates layer

- `@talismn/token-rates`: new `fetchDTaoTokenRates` — fetches subnet pool prices (chain state_call via an injected connector) and 24h changes (tao-data api via an injected fetch) and computes per-tokenId rates for subnet alpha tokens, with keep-last-on-failure semantics; new `getDTaoTokenRates` — the underlying rate math (moved from `@talismn/balances`). Hosts stay responsible for when to call and how to merge/persist
- `@talismn/balances`: dtao pricing removed from the balances layer — `Balance.rates` resolves dtao tokens from the hydrated tokenRates list like any other token; `scaledAlphaPrice` is no longer fetched per poll nor stamped on balance meta (balances stay reference-stable across pool price moves); `SubDTaoBalanceMeta` narrowed to `{ convictionLock? }`; `getDTaoTokenRates` and `getScaledAlphaPrice` exports removed; `calculatePendingRootClaimable` loses its price param
