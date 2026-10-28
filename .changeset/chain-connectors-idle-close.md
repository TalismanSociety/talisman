---
"@talismn/chain-connectors": patch
---

ChainConnectorDot keeps a chain's socket open for 30 seconds after its last user releases it, so a request followed by a subscription (balances read the runtime version, then subscribe to storage) shares one socket instead of closing the first and opening another
