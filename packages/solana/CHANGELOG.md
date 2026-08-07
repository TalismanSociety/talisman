# @talismn/solana

## 1.0.1

### Patch Changes

- Updated dependencies [1997638]
  - @talismn/crypto@1.0.1

## 1.0.0

### Major Changes

- f0abc19: Relicense: packages move from GPL-3.0-or-later to the Talisman Licence, except `@talismn/orb`, which moves to MIT.

### Minor Changes

- 921aee5: Migrate the Solana stack from @solana/web3.js v1 + @solana/spl-token to @solana/kit + @solana-program clients

  - `@talismn/chain-connectors`: `IChainConnectorSol` now exposes `getRpc`/`getTransport` (kit `Rpc`/`RpcTransport`) instead of `getConnection`; `ChainConnectorSolStub` takes a network object only
  - `@talismn/balances`: `SolTransferCallData` is now kit `Instruction[]`; solana modules fetch via kit rpc; token-2022 transfer-hook extra-account resolution ported in (with tests)
  - `@talismn/solana`: rewritten on kit's transaction model (`messageBytes` + signatures map) — `parseTransactionInfo`, `serializeTransaction`/`deserializeTransaction` (legacy + v0), `buildUnsignedTransaction`, `setTransactionBlockhash`, `attachTransactionSignature`, `signTransactionWithSecretKey` (@noble ed25519, no Keypair/WebCrypto); adds `serializeOffchainMessage` (CLI/Ledger off-chain message envelope) and `getVerifiedTransactionSignature` (per-signer slot check, works on co-signed transactions); `parseTransactionInfo` now reports the fee payer's canonical signature

### Patch Changes

- 187a064: Migrate the substrate stack from @polkadot/\* to the polkadot-api ecosystem

  - `@talismn/chain-connectors`: `ChainConnectorDot` rebuilt on `@polkadot-api/ws-provider` + `substrate-client` (native endpoint failover, auto-resubscribe on reconnect, keep-alive, `StaleRpcError`); `asProvider()` removed; `@talismn/connection-meta` retired
  - `@talismn/sapi`: fee estimation and `CheckMetadataHash` payloads built with `@polkadot-api/tx-utils`/`signers-common`; pjs `TypeRegistry` helpers removed; `SignerPayloadJSON` type vendored
  - `@talismn/balances`: substrate-psp22 module ported off `@polkadot/api-contract` (hand-rolled selectors + scale codecs, byte-parity tested)
  - `@talismn/crypto`: adds `signSubstrate` (sr25519/ed25519/ecdsa/ethereum, pjs byte-parity), pjs keystore JSON encrypt/decrypt (scrypt + xsalsa20poly1305), sr25519 shared-secret helpers
  - `@talismn/util`: adds pjs-parity byte/hex helpers (`hexToU8a`, `u8aToHex`, `u8aWrapBytes`, …) and `assert`

- 24fee4e: Upgrade to typescript 7, switch build tool from tsup to tsdown
- Updated dependencies [921aee5]
- Updated dependencies [187a064]
- Updated dependencies [f0abc19]
- Updated dependencies [24fee4e]
  - @talismn/crypto@1.0.0

## 0.0.10

### Patch Changes

- 9aa9c72: build with typescript 6 (dev tooling). crypto/keyring type-compat fixes are byte-identical with no behaviour change
- Updated dependencies [73ee8d7]
- Updated dependencies [ab11fa6]
- Updated dependencies [9aa9c72]
  - @talismn/crypto@0.3.5

## 0.0.9

### Patch Changes

- c83c063: fix: explicit vitest imports
- Updated dependencies [c83c063]
  - @talismn/crypto@0.3.4

## 0.0.8

### Patch Changes

- Updated dependencies [177feec]
- Updated dependencies [e1a736f]
  - @talismn/crypto@0.3.3

## 0.0.7

### Patch Changes

- e70d6e6: fix: github url
- Updated dependencies [e70d6e6]
  - @talismn/crypto@0.3.2

## 0.0.6

### Patch Changes

- 8faa23a: utilities for earn tab
- dd51038: apply biome lint suggestions
- bd74d55: github url in package.json
- 1977d5d: fix typescript config for tests
- 250839f: migration from preconstruct to tsup
- 250839f: migrate eslint+prettier to biome
- Updated dependencies [dd51038]
- Updated dependencies [bd74d55]
- Updated dependencies [1977d5d]
- Updated dependencies [250839f]
- Updated dependencies [250839f]
  - @talismn/crypto@0.3.1

## 0.0.5

### Patch Changes

- Updated dependencies [b3b5ff5]
- Updated dependencies [b3b5ff5]
  - @talismn/crypto@0.3.0

## 0.0.4

### Patch Changes

- f97a95f: new txToHumanJson helper

## 0.0.3

### Patch Changes

- 72acc04: chore: tidied up tsconfig.json
- Updated dependencies [72acc04]
  - @talismn/crypto@0.2.3

## 0.0.2

### Patch Changes

- e399b86: chore: bump min nodejs version to 20
- Updated dependencies [e399b86]
  - @talismn/crypto@0.2.2

## 0.0.1

### Patch Changes

- f0a103b: feat: updates for solana
- Updated dependencies [a922bed]
- Updated dependencies [f0a103b]
  - @talismn/crypto@0.2.1
