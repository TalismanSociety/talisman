# @talismn/chain-connectors

## 1.0.2

### Patch Changes

- Updated dependencies [aa5a15e]
- Updated dependencies [88f2fca]
  - @talismn/chaindata-provider@2.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [2d5885d]
- Updated dependencies [de382f6]
  - @talismn/chaindata-provider@2.0.1

## 1.0.0

### Major Changes

- 187a064: Migrate the substrate stack from @polkadot/\* to the polkadot-api ecosystem

  - `@talismn/chain-connectors`: `ChainConnectorDot` rebuilt on `@polkadot-api/ws-provider` + `substrate-client` (native endpoint failover, auto-resubscribe on reconnect, keep-alive, `StaleRpcError`); `asProvider()` removed; `@talismn/connection-meta` retired
  - `@talismn/sapi`: fee estimation and `CheckMetadataHash` payloads built with `@polkadot-api/tx-utils`/`signers-common`; pjs `TypeRegistry` helpers removed; `SignerPayloadJSON` type vendored
  - `@talismn/balances`: substrate-psp22 module ported off `@polkadot/api-contract` (hand-rolled selectors + scale codecs, byte-parity tested)
  - `@talismn/crypto`: adds `signSubstrate` (sr25519/ed25519/ecdsa/ethereum, pjs byte-parity), pjs keystore JSON encrypt/decrypt (scrypt + xsalsa20poly1305), sr25519 shared-secret helpers
  - `@talismn/util`: adds pjs-parity byte/hex helpers (`hexToU8a`, `u8aToHex`, `u8aWrapBytes`, …) and `assert`

- f0abc19: Relicense: packages move from GPL-3.0-or-later to the Talisman Licence, except `@talismn/orb`, which moves to MIT.

### Minor Changes

- 921aee5: Migrate the Solana stack from @solana/web3.js v1 + @solana/spl-token to @solana/kit + @solana-program clients

  - `@talismn/chain-connectors`: `IChainConnectorSol` now exposes `getRpc`/`getTransport` (kit `Rpc`/`RpcTransport`) instead of `getConnection`; `ChainConnectorSolStub` takes a network object only
  - `@talismn/balances`: `SolTransferCallData` is now kit `Instruction[]`; solana modules fetch via kit rpc; token-2022 transfer-hook extra-account resolution ported in (with tests)
  - `@talismn/solana`: rewritten on kit's transaction model (`messageBytes` + signatures map) — `parseTransactionInfo`, `serializeTransaction`/`deserializeTransaction` (legacy + v0), `buildUnsignedTransaction`, `setTransactionBlockhash`, `attachTransactionSignature`, `signTransactionWithSecretKey` (@noble ed25519, no Keypair/WebCrypto); adds `serializeOffchainMessage` (CLI/Ledger off-chain message envelope) and `getVerifiedTransactionSignature` (per-signer slot check, works on co-signed transactions); `parseTransactionInfo` now reports the fee payer's canonical signature

### Patch Changes

- c714f08: Bump patch/minor dependencies (eventemitter3, dexie, react-icons)
- 8939669: Bump @polkadot-api/ws-provider to 0.9.1, which picks up the sync-provider reconnect backoff fix
- 24fee4e: Upgrade to typescript 7, switch build tool from tsup to tsdown
- Updated dependencies [253ca85]
- Updated dependencies [c714f08]
- Updated dependencies [bd1581b]
- Updated dependencies [4f1ba49]
- Updated dependencies [187a064]
- Updated dependencies [4f1ba49]
- Updated dependencies [f0abc19]
- Updated dependencies [dccbbf8]
- Updated dependencies [82ba63a]
- Updated dependencies [ffc679c]
- Updated dependencies [24fee4e]
  - @talismn/util@2.0.0
  - @talismn/chaindata-provider@2.0.0

## 0.1.1

### Patch Changes

- Updated dependencies [3107f1b]
- Updated dependencies [1e434d5]
  - @talismn/chaindata-provider@1.5.1
  - @talismn/connection-meta@0.3.1

## 0.1.0

### Minor Changes

- 0a94c4b: bump dependencies

### Patch Changes

- aa5e55b: fix unsafe instanceOf usage
- 9aa9c72: build with typescript 6 (dev tooling). crypto/keyring type-compat fixes are byte-identical with no behaviour change
- b672e3a: bump viem to 2.52.2
- Updated dependencies [91cdabe]
- Updated dependencies [bc509f5]
- Updated dependencies [c6ffb9c]
- Updated dependencies [0a94c4b]
- Updated dependencies [b9f92ab]
- Updated dependencies [ee110a0]
- Updated dependencies [5133bff]
- Updated dependencies [aa5e55b]
- Updated dependencies [9aa9c72]
- Updated dependencies [7d99a0a]
- Updated dependencies [bbf4fca]
  - @talismn/util@1.1.0
  - @talismn/chaindata-provider@1.5.0
  - @talismn/connection-meta@0.3.0

## 0.0.19

### Patch Changes

- 77a7bf8: chore: remove @polkadot/util and @polkadot/util-crypto
- Updated dependencies [9bb4b12]
- Updated dependencies [81a539b]
- Updated dependencies [0738101]
- Updated dependencies [f7ff987]
- Updated dependencies [a02eefe]
  - @talismn/chaindata-provider@1.4.0
  - @talismn/connection-meta@0.2.39

## 0.0.18

### Patch Changes

- c83c063: fix: explicit vitest imports
- Updated dependencies [c83c063]
- Updated dependencies [c83c063]
- Updated dependencies [b3e61b3]
- Updated dependencies [2bdb305]
- Updated dependencies [95118f2]
  - @talismn/chaindata-provider@1.3.9
  - @talismn/connection-meta@0.2.38
  - @talismn/util@1.0.1

## 0.0.17

### Patch Changes

- Updated dependencies [185c24f]
  - @talismn/chaindata-provider@1.3.8
  - @talismn/connection-meta@0.2.37

## 0.0.16

### Patch Changes

- 6d4ee42: performance improvements + new tests
- a8a0727: bump papi deps
- Updated dependencies [6d4ee42]
- Updated dependencies [e1a736f]
- Updated dependencies [6577dce]
- Updated dependencies [7609ac1]
- Updated dependencies [9929e2d]
- Updated dependencies [51e0da6]
- Updated dependencies [19fd19d]
- Updated dependencies [6d4ee42]
  - @talismn/chaindata-provider@1.3.7
  - @talismn/connection-meta@0.2.36
  - @talismn/util@1.0.0

## 0.0.15

### Patch Changes

- e70d6e6: fix: github url
- Updated dependencies [e70d6e6]
- Updated dependencies [2dd2339]
- Updated dependencies [e70d6e6]
  - @talismn/util@0.5.8
  - @talismn/chaindata-provider@1.3.6
  - @talismn/connection-meta@0.2.35

## 0.0.14

### Patch Changes

- dd51038: apply biome lint suggestions
- bd74d55: github url in package.json
- 1977d5d: fix typescript config for tests
- 250839f: migration from preconstruct to tsup
- 250839f: migrate eslint+prettier to biome
- Updated dependencies [8faa23a]
- Updated dependencies [d3a5a3a]
- Updated dependencies [dd51038]
- Updated dependencies [b1c3d0c]
- Updated dependencies [f6210b4]
- Updated dependencies [bd74d55]
- Updated dependencies [1977d5d]
- Updated dependencies [250839f]
- Updated dependencies [250839f]
  - @talismn/util@0.5.7
  - @talismn/chaindata-provider@1.3.5
  - @talismn/connection-meta@0.2.34

## 0.0.13

### Patch Changes

- Updated dependencies [332e20f]
  - @talismn/chaindata-provider@1.3.4
  - @talismn/connection-meta@0.2.33

## 0.0.12

### Patch Changes

- Updated dependencies [87f53ed]
- Updated dependencies [4bb06de]
  - @talismn/chaindata-provider@1.3.3
  - @talismn/connection-meta@0.2.32

## 0.0.11

### Patch Changes

- Updated dependencies [0f26ccd]
  - @talismn/chaindata-provider@1.3.2
  - @talismn/connection-meta@0.2.31

## 0.0.10

### Patch Changes

- Updated dependencies [7deed17]
- Updated dependencies [2c395d3]
- Updated dependencies [05e1e30]
- Updated dependencies [9b5618c]
  - @talismn/chaindata-provider@1.3.1
  - @talismn/util@0.5.6
  - @talismn/connection-meta@0.2.30

## 0.0.9

### Patch Changes

- Updated dependencies [927f797]
- Updated dependencies [f603f41]
- Updated dependencies [e1e20e5]
- Updated dependencies [4d24072]
- Updated dependencies [1f4146c]
  - @talismn/chaindata-provider@1.3.0
  - @talismn/connection-meta@0.2.29

## 0.0.8

### Patch Changes

- Updated dependencies [c883b67]
- Updated dependencies [75fb494]
- Updated dependencies [165749d]
  - @talismn/chaindata-provider@1.2.0
  - @talismn/connection-meta@0.2.28

## 0.0.7

### Patch Changes

- Updated dependencies [8266e9c]
- Updated dependencies [ceaf004]
  - @talismn/chaindata-provider@1.1.6
  - @talismn/connection-meta@0.2.27

## 0.0.6

### Patch Changes

- Updated dependencies [695a4a9]
- Updated dependencies [1cb2c51]
- Updated dependencies [af411b9]
- Updated dependencies [4493b28]
  - @talismn/chaindata-provider@1.1.5
  - @talismn/util@0.5.5
  - @talismn/connection-meta@0.2.26

## 0.0.5

### Patch Changes

- 72acc04: chore: tidied up tsconfig.json
- Updated dependencies [72acc04]
  - @talismn/chaindata-provider@1.1.4
  - @talismn/connection-meta@0.2.25
  - @talismn/util@0.5.4

## 0.0.4

### Patch Changes

- Updated dependencies [cc3fa02]
- Updated dependencies [f2d3cf5]
- Updated dependencies [f2d3cf5]
  - @talismn/chaindata-provider@1.1.3
  - @talismn/util@0.5.3
  - @talismn/connection-meta@0.2.24

## 0.0.3

### Patch Changes

- e399b86: chore: bump min nodejs version to 20
- Updated dependencies [0d38ece]
- Updated dependencies [e399b86]
  - @talismn/chaindata-provider@1.1.2
  - @talismn/connection-meta@0.2.23
  - @talismn/util@0.5.2

## 0.0.2

### Patch Changes

- Updated dependencies [9869029]
  - @talismn/chaindata-provider@1.1.1
  - @talismn/connection-meta@0.2.22

## 0.0.1

### Patch Changes

- 52b851c: ignore zora testnet from viem
- f0a103b: feat: updates for solana
- Updated dependencies [7b41204]
- Updated dependencies [f5e2f60]
- Updated dependencies [dfe2992]
- Updated dependencies [0c9b3c7]
- Updated dependencies [8a31f57]
- Updated dependencies [f0a103b]
- Updated dependencies [a922bed]
- Updated dependencies [f0a103b]
  - @talismn/chaindata-provider@1.1.0
  - @talismn/util@0.5.1
  - @talismn/connection-meta@0.2.21
