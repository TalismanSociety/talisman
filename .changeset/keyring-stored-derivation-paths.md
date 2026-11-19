---
"@talismn/keyring": patch
---

an account stored with a derivation path that `@talismn/crypto` now rejects still loads, decrypts, renames and exports; only deriving from that path again throws, which the keyring never does for a stored account
