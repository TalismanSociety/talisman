---
"@talismn/chain-connectors": patch
"@talismn/balances": patch
---

check that each RPC serves the network (genesis hash for Polkadot SDK and Solana, `eth_chainId` for EVM) before sending it anything, and fail over past one that serves another chain
