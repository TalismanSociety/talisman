---
"@talismn/keyring": patch
---

a keyring method that throws leaves the keyring unchanged: `addAccountDerive` no longer keeps a new mnemonic when the derivation fails or the account exists, a failed first change no longer sets the password, and `updateAccount` and `updateMnemonic` check every option before applying any
