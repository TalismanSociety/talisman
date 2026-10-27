---
"@talismn/crypto": minor
---

Reject malformed substrate derivation paths (characters outside `[A-Za-z0-9_]`, `///password`, and numeric codes such as `0x1000` that earlier versions read differently from polkadot-js) instead of deriving the root or another account, and derive decimal junctions of 2^32 and above, and junction codes over 32 bytes, as polkadot-js does; reject Solana path indexes that aren't decimal integers below 2^31
