---
"@talismn/keyring": patch
"@talismn/crypto": patch
---

feat: use `crypto.subtle` instead of `@noble/hashes` for pbkdf2 inside of `entropyToSeed` for increased key derivation performance on mobile
