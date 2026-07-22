# @talismn/sapi

## 2.0.0

### Major Changes

- 187a064: Migrate the substrate stack from @polkadot/\* to the polkadot-api ecosystem

  - `@talismn/chain-connectors`: `ChainConnectorDot` rebuilt on `@polkadot-api/ws-provider` + `substrate-client` (native endpoint failover, auto-resubscribe on reconnect, keep-alive, `StaleRpcError`); `asProvider()` removed; `@talismn/connection-meta` retired
  - `@talismn/sapi`: fee estimation and `CheckMetadataHash` payloads built with `@polkadot-api/tx-utils`/`signers-common`; pjs `TypeRegistry` helpers removed; `SignerPayloadJSON` type vendored
  - `@talismn/balances`: substrate-psp22 module ported off `@polkadot/api-contract` (hand-rolled selectors + scale codecs, byte-parity tested)
  - `@talismn/crypto`: adds `signSubstrate` (sr25519/ed25519/ecdsa/ethereum, pjs byte-parity), pjs keystore JSON encrypt/decrypt (scrypt + xsalsa20poly1305), sr25519 shared-secret helpers
  - `@talismn/util`: adds pjs-parity byte/hex helpers (`hexToU8a`, `u8aToHex`, `u8aWrapBytes`, …) and `assert`

- f0abc19: Relicense: packages move from GPL-3.0-or-later to the Talisman Licence, except `@talismn/orb`, which moves to MIT.

### Minor Changes

- 7a68097: Add `hasConstant` (checks pallet constant existence in metadata)

### Patch Changes

- 24fee4e: Upgrade to typescript 7, switch build tool from tsup to tsdown
- 793ec8a: Replace the vendored tx-utils fork with the published `@polkadot-api/tx-utils@0.5.0`, which now supports custom signed-extension mappers natively on both `getPjsTxHelper` and `getTxHelper`. `CUSTOM_SIGNED_EXTENSIONS` (Avail `CheckAppId`) rewritten to the upstream mapper signature — no regression: the sign-request details drawer keeps decoding nonce/mortality on chains with custom signed extensions (Avail)
- Updated dependencies [f0abc19]
- Updated dependencies [24fee4e]
  - @talismn/scale@2.0.0

## 1.0.0

### Major Changes

- 1e434d5: migrate to polkadot-api v2

  BREAKING: the `Binary`/`FixedSizeBinary` classes are removed. Fixed-size `[u8; N]`
  fields (`AccountId32`, `AccountKey20`, …) now decode to `0x` hex strings (`SizedHex`)
  and variable-length `Vec<u8>` fields decode to `Uint8Array`. `@talismn/scale` drops
  the `FixedSizeBinary` re-export and adds `SizedHex`.

### Patch Changes

- Updated dependencies [1e434d5]
  - @talismn/scale@1.0.0

## 0.1.7

### Patch Changes

- b408b0c: bump @polkadot/types and @polkadot/types-codec to 16.5.6
- 9aa9c72: build with typescript 6 (dev tooling). crypto/keyring type-compat fixes are byte-identical with no behaviour change
- Updated dependencies [9aa9c72]
  - @talismn/scale@0.3.5

## 0.1.6

### Patch Changes

- 77a7bf8: chore: remove @polkadot/util and @polkadot/util-crypto

## 0.1.5

### Patch Changes

- c83c063: fix: explicit vitest imports
- Updated dependencies [c83c063]
  - @talismn/scale@0.3.4

## 0.1.4

### Patch Changes

- a37f6f9: add hasEvent utility

## 0.1.3

### Patch Changes

- a8a0727: bump papi deps
- Updated dependencies [a8a0727]
  - @talismn/scale@0.3.3

## 0.1.2

### Patch Changes

- e70d6e6: fix: github url
- e70d6e6: fix log trace
- e70d6e6: feat: export ScaleApiSubmitMode type
- Updated dependencies [e70d6e6]
  - @talismn/scale@0.3.2

## 0.1.1

### Patch Changes

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
  - @talismn/scale@0.3.1

## 0.1.0

### Minor Changes

- b3b5ff5: bittensor mev shield

### Patch Changes

- Updated dependencies [b3b5ff5]
  - @talismn/scale@0.3.0

## 0.0.12

### Patch Changes

- 16c2ee4: set max metadata version to 15
- 72acc04: chore: tidied up tsconfig.json
- Updated dependencies [72acc04]
  - @talismn/scale@0.2.2

## 0.0.11

### Patch Changes

- e399b86: chore: bump min nodejs version to 20
- Updated dependencies [e399b86]
  - @talismn/scale@0.2.1

## 0.0.10

### Patch Changes

- f0a103b: feat: updates for solana

## 0.0.9

### Patch Changes

- 045fc70: remove unnecessary log

## 0.0.8

### Patch Changes

- 51dba85: fix: getBestMetadata for stafi

## 0.0.7

### Patch Changes

- f6e9d24: fix: tx crafting for autonomys
- Updated dependencies [411726c]
  - @talismn/scale@0.2.0

## 0.0.6

### Patch Changes

- 2773be6: fix: era reference when creating payloads

## 0.0.5

### Patch Changes

- 549f1e5: fetchBestMetadata method

## 0.0.4

### Patch Changes

- 78f3616: bump pjs and papi deps
- Updated dependencies [78f3616]
  - @talismn/scale@0.1.2

## 0.0.3

### Patch Changes

- a16afbc: fix: use new token-rates api

## 0.0.2

### Patch Changes

- c339aa7: feat: use papi for decoding bittensor runtime api types
- Updated dependencies [c339aa7]
  - @talismn/scale@0.1.1
