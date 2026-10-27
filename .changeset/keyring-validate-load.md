---
"@talismn/keyring": minor
---

`Keyring.load` checks the structure of the data and throws on a malformed blob: wrong container types, unknown account types, malformed mnemonics and keypair accounts, duplicate mnemonic ids, and secrets without a `passwordCheck`. It no longer changes the object it is given
