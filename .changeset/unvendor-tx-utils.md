---
"@talismn/sapi": patch
---

Replace the vendored tx-utils fork with the published `@polkadot-api/tx-utils@0.5.0`, which now supports custom signed-extension mappers natively on both `getPjsTxHelper` and `getTxHelper`. `CUSTOM_SIGNED_EXTENSIONS` (Avail `CheckAppId`) rewritten to the upstream mapper signature — no regression: the sign-request details drawer keeps decoding nonce/mortality on chains with custom signed extensions (Avail)
