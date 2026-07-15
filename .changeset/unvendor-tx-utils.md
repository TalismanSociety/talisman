---
"@talismn/sapi": patch
---

Replace the vendored tx-utils fork with the published `@polkadot-api/tx-utils@0.4.0`, which now supports custom signed-extension mappers on `getPjsTxHelper` natively. `CUSTOM_SIGNED_EXTENSIONS` (Avail `CheckAppId`) rewritten to the upstream mapper signature. Known limitation: upstream `getTxHelper` (decode-for-display) has no custom-extension support, so the sign-request details drawer omits nonce/mortality on chains with unknown non-void signed extensions (Avail)
