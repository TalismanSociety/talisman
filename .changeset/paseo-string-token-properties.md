---
"@talismn/balances": patch
---

Coerce string-encoded `tokenDecimals` in substrate-native `system_properties` (fixes native token/balance fetch on chains like the reset Paseo relay whose node serializes numbers as strings)
