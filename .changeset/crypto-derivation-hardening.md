---
"@talismn/crypto": minor
---

Reject malformed substrate derivation paths (characters outside `[A-Za-z0-9_]`, `///password`, out-of-range or ambiguous numeric junctions) instead of deriving the root or another account, and hash junction codes over 32 bytes as polkadot-js does
