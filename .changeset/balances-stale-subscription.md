---
"@talismn/balances": patch
"@talismn/chain-connectors": patch
---

substrate balance subscriptions survive a StaleRpcError and resubscribe with backoff after other errors, so the chain's socket stays held between dtao polls instead of reopening on the first RPC for every request
