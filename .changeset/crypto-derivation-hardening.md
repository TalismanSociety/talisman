---
"@talismn/crypto": minor
---

Reject malformed substrate derivation paths instead of deriving the root or another account: characters outside `[A-Za-z0-9_]`, numeric codes such as `0x1000` that earlier versions read differently from polkadot-js, and `///password`, which earlier versions derived as the hard junction `//password` (derivation paths take `//` and `/` junctions only; polkadot-js applies the password to the seed). Derive decimal junctions of 2^32 and above, and junction codes over 32 bytes, as polkadot-js does. Reject Solana path indexes that aren't decimal integers below 2^31.
