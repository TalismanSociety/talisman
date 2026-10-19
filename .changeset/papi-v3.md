---
"@talismn/scale": major
"@talismn/sapi": major
"@talismn/balances": patch
"@talismn/chain-connectors": patch
---

upgrade to polkadot-api v3: `UnifiedMetadata` exposes `extrinsic.extensionsByVersion` instead of `extrinsic.signedExtensions`. `@talismn/scale` adds `getSignedExtensions` and `hasSignedExtension`. `@talismn/sapi` now requires an `rxjs` peer dependency.
