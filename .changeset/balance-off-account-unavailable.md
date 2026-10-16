---
"@talismn/balances": patch
---

`Balance.locked` ignores `includeInTransferable` locks, and `Balance.unavailable` counts the extras included in the total, so `transferable + unavailable` equals `total`
