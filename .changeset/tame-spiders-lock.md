---
"@talismn/balances": patch
---

expose the keyed hotkey on dtao conviction locks: `findDTaoConvictionLock` / `DTaoConvictionLockInfo` now return the lock's `hotkey` (also added to the conviction lock balance meta). This lets consumers top up an existing conviction lock, which the chain only allows against the lock's existing hotkey.
