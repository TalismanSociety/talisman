---
"@talismn/balances": minor
---

Steady-state emission suppression and JS-thread friendliness for balance pipelines:

- Stabilize IBalance object references across emissions (`stabilizeModuleResults`): unchanged balances keep their previous object identity, so fingerprint caches, `distinctUntilChanged` item compares and host-side memoization hit instead of re-serializing/re-rendering the full result set every block/poll.
- substrate-dtao: tolerate sub-0.1% per-block drift of `meta.scaledAlphaPrice` (AMM price) and pending-root-claim accrual, which previously defeated every dedup stage and forced a full downstream re-emission every 6s poll.
- BalancesProvider: coalesce near-simultaneous multi-network emissions (auditTime) and time-slice the aggregation (chunked stale-marking + k-way merge of pre-sorted per-network arrays instead of a full re-sort), yielding the JS thread on budget.
- Balance: cache computed accessors (total/free/reserved/locked/transferable/unavailable/feePayable/rates) per instance, invalidated on hydrate — these run in hot sorting/summing loops and previously re-derived values and allocated several BalanceFormatters per access.
