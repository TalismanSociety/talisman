---
"@talismn/crypto": minor
---

Add `getLegacyDerivationPath`: for a substrate or Solana derivation path that is now rejected, the path that derives the key earlier versions derived from it (`//hard//password` for `//hard///password`), so an account stored with the rejected path can show the path that restores it
