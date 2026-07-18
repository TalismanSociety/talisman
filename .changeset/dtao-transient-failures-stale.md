---
"@talismn/balances": patch
---

Fail dtao polls on transient RPC errors instead of resolving empty: conviction-lock and root-claim fetch failures previously read as "balance no longer exists", deleting the stored balance and making lock-only/claim-only rows (e.g. SN128) flap in and out of the portfolio on every other poll. Failed polls now mark balances stale, keeping rows rendered.
