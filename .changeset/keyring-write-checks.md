---
"@talismn/keyring": patch
---

`updateAccount` and `updateMnemonic` check every option before applying any, and `addAccountKeypair` and `addAccountDerive` check for an existing account again after they await, so concurrent calls on one keyring can't add the same account twice
