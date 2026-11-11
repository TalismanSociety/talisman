---
"@talismn/chain-connectors": minor
---

export the chain identity helpers for apps that build their own clients: `getVerifiedWsProvider` (with a new `middleware` option, applied above the check), `evmRpcServesChain` and the verdict cache (`getIdentityVerdict`, `recordIdentityVerdict`, `isKnownMismatch`, `resetIdentityVerdicts`, `genesisHashMatches`). `getVerifiedWsProvider` no longer fails to connect to a network without a genesis hash when no `onStatusChanged` is given
