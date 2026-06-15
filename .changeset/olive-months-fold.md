---
"@talismn/chaindata-provider": minor
"@talismn/balances": minor
---

minimetadata v11 - dtao conviction locks

conviction locks are reported on the subnet's base (hotkey-less) token balance, as on-chain they constrain the coldkey's total alpha on the subnet rather than a specific staking position. The lock surfaces in the balance's locked amount but does not reduce its available/transferable amount (the locked stake remains transferable via transfer_stake), and `findDTaoConvictionLock` is exposed to read a balance's conviction lock
