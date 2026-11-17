---
"@talismn/balances": patch
---

Bittensor subnet token names drop the separator and the token symbol: `SN5 Hone` instead of `SN5 | Hone ε`, and `SN0 Root` instead of `SN0 | Root Τ`. A subnet with an empty on-chain name falls back to `Subnet <netuid>`, as a missing name already did.
