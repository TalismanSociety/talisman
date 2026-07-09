---
"@talismn/chain-connectors": major
"@talismn/sapi": major
"@talismn/balances": minor
"@talismn/crypto": minor
"@talismn/util": minor
"@talismn/solana": patch
---

Migrate the substrate stack from @polkadot/* to the polkadot-api ecosystem

- `@talismn/chain-connectors`: `ChainConnectorDot` rebuilt on `@polkadot-api/ws-provider` + `substrate-client` (native endpoint failover, auto-resubscribe on reconnect, keep-alive, `StaleRpcError`); `asProvider()` removed; `@talismn/connection-meta` retired
- `@talismn/sapi`: fee estimation and `CheckMetadataHash` payloads built with `@polkadot-api/tx-utils`/`signers-common`; pjs `TypeRegistry` helpers removed; `SignerPayloadJSON` type vendored
- `@talismn/balances`: substrate-psp22 module ported off `@polkadot/api-contract` (hand-rolled selectors + scale codecs, byte-parity tested)
- `@talismn/crypto`: adds `signSubstrate` (sr25519/ed25519/ecdsa/ethereum, pjs byte-parity), pjs keystore JSON encrypt/decrypt (scrypt + xsalsa20poly1305), sr25519 shared-secret helpers
- `@talismn/util`: adds pjs-parity byte/hex helpers (`hexToU8a`, `u8aToHex`, `u8aWrapBytes`, …) and `assert`
