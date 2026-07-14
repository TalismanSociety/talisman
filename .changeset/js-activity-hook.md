---
"@talismn/util": minor
"@talismn/balances": patch
---

JS-thread stall attribution hooks:

- `@talismn/util`: new `reportJsActivity(label, durMs?)` — reports to an optional host-installed `globalThis.__recordJsActivity` hook (no-op otherwise), so host apps running a JS-thread stall watchdog can attribute blocked time to library work. `createTimeSlicer`/`switchMapChunked`/`concatMapChunked` accept a `label` and report slices that ran ≥3× past their budget (a single indivisible work item blocked the thread).
- `@talismn/balances`: labeled the chunked decode/aggregation pipelines, and reports full-metadata parses (`parseMetadataRpcCached` cache misses, with duration and cache pressure) and miniMetadata builds.
