---
"@talismn/keyring": minor
---

`Keyring.export` verifies the current password against `passwordCheck` before it re-encrypts anything, so it rejects a wrong password on a keyring without mnemonics or keypair accounts too
