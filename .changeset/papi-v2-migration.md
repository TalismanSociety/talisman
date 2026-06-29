---
"@talismn/scale": major
"@talismn/balances": major
"@talismn/sapi": major
---

migrate to polkadot-api v2

BREAKING: the `Binary`/`FixedSizeBinary` classes are removed. Fixed-size `[u8; N]`
fields (`AccountId32`, `AccountKey20`, …) now decode to `0x` hex strings (`SizedHex`)
and variable-length `Vec<u8>` fields decode to `Uint8Array`. `@talismn/scale` drops
the `FixedSizeBinary` re-export and adds `SizedHex`.
