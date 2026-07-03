---
"@talismn/solana": minor
"@talismn/chain-connectors": minor
"@talismn/balances": major
---

Migrate the Solana stack from @solana/web3.js v1 + @solana/spl-token to @solana/kit + @solana-program clients

- `@talismn/chain-connectors`: `IChainConnectorSol` now exposes `getRpc`/`getTransport` (kit `Rpc`/`RpcTransport`) instead of `getConnection`; `ChainConnectorSolStub` takes a network object only
- `@talismn/balances`: `SolTransferCallData` is now kit `Instruction[]`; solana modules fetch via kit rpc; token-2022 transfer-hook extra-account resolution ported in (with tests)
- `@talismn/solana`: rewritten on kit's transaction model (`messageBytes` + signatures map) — `parseTransactionInfo`, `serializeTransaction`/`deserializeTransaction` (legacy + v0), `buildUnsignedTransaction`, `setTransactionBlockhash`, `attachTransactionSignature`, `signTransactionWithSecretKey` (@noble ed25519, no Keypair/WebCrypto); adds `serializeOffchainMessage` (CLI/Ledger off-chain message envelope)
