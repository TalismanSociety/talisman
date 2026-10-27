---
"@talismn/keyring": patch
---

the keyring zeroes the decrypted entropy, seeds and derived secret keys it holds once it is done with them, including when a method throws. `getAccountSecretKey` still returns the key to the caller, who owns it
