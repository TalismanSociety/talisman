---
"@talismn/chaindata-provider": minor
"@talismn/balances": minor
---

minimetadata v11 - dtao conviction locks

conviction locks are reported on the subnet's base (hotkey-less) token balance, as on-chain they constrain the coldkey's total alpha on the subnet rather than a specific staking position. Balances sums subtract locks exceeding their own balance's free amount from the aggregated transferable amount, and `findDTaoConvictionLock` is exposed to read a balance's conviction lock
