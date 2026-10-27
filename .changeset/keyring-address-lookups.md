---
"@talismn/keyring": patch
---

every account lookup matches addresses with `isAddressEqual`, so `updateAccount` and `getAccountSecretKey` find an account by any encoding of its address, as `getAccount` and `removeAccount` do. `addAccountExternal` checks the fields of the account's type and rejects `secretKey` and `mnemonicId`
