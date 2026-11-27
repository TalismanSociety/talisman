---
"@talismn/chaindata-provider": minor
---

`syncDynamicTokens` reads the token map once instead of once per dynamic token: with the full chaindata (about 38,000 tokens) and 100 dtao positions, a call takes about 0.3s instead of 24s. It rewrites a per-hotkey dtao token only when its symbol, name, logo or subnet name differs from its subnet's token, so a subnet token without a logo no longer causes a write on every call. The sync itself is exported as `getSyncedDynamicTokens`, for hosts that seed their tokens from storage before a `ChaindataProvider` is running.
