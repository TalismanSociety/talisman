---
"@talismn/crypto": patch
---

the derivation functions zero the intermediate keys, seeds and mnemonic bytes they allocate and don't return, and `deriveSubstrateSecretKey` returns a copy of the seed for an empty path instead of the seed itself
