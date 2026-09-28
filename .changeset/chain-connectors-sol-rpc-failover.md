---
"@talismn/chain-connectors": patch
---

Solana transport fails over through all of a network's RPCs instead of using only the first, and starts each request at the RPC that answered last
