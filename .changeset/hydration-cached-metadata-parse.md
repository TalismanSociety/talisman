---
"@talismn/balances": patch
---

Fix a recurring ~1s JS-thread stall: `fetchRuntimeCallResult` ran the UNCACHED full
metadata parse (~200ms, indivisible) whenever it was passed a raw metadata hex string —
substrate-hydration does this once per address on every 6s poll. Now routed through
`parseMetadataRpcCached` (as are the assets/foreignassets/hydration `fetchTokens` paths,
which use the read-only builder). `getMiniMetadata` paths intentionally stay uncached:
they pass the parsed metadata to `compactMetadata`, which mutates it in place.

Also: balance drift (AMM price movement, root-claim accrual beyond tolerance) now
re-emits at most once per 30s per balance instead of on every poll — a fast-accruing
pending claim could previously defeat any relative tolerance and force a full pipeline
pass every 6s.
