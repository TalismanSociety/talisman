---
"@talismn/crypto": patch
---

`parseSecretKey` ignores surrounding whitespace, requires an Ethereum key to be exactly 32 bytes, and rejects a Solana JSON array whose elements are not integers 0..255 instead of coercing them to bytes
