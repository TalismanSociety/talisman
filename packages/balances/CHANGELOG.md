# @talismn/balances

## 3.0.0

### Major Changes

- 5c5aa09: Consolidate bittensor dtao (subnet alpha) token pricing into the token-rates layer

  - `@talismn/token-rates`: new `fetchDTaoTokenRates` — fetches subnet pool prices (chain state_call via an injected connector) and 24h changes (tao-data api via an injected fetch) and computes per-tokenId rates for subnet alpha tokens, with keep-last-on-failure semantics; new `getDTaoTokenRates` — the underlying rate math (moved from `@talismn/balances`). Hosts stay responsible for when to call and how to merge/persist
  - `@talismn/balances`: dtao pricing removed from the balances layer — `Balance.rates` resolves dtao tokens from the hydrated tokenRates list like any other token; `scaledAlphaPrice` is no longer fetched per poll nor stamped on balance meta (balances stay reference-stable across pool price moves); `SubDTaoBalanceMeta` narrowed to `{ convictionLock? }`; `getDTaoTokenRates` and `getScaledAlphaPrice` exports removed; `calculatePendingRootClaimable` loses its price param

- f0abc19: Relicense: packages move from GPL-3.0-or-later to the Talisman Licence, except `@talismn/orb`, which moves to MIT.
- 921aee5: Migrate the Solana stack from @solana/web3.js v1 + @solana/spl-token to @solana/kit + @solana-program clients

  - `@talismn/chain-connectors`: `IChainConnectorSol` now exposes `getRpc`/`getTransport` (kit `Rpc`/`RpcTransport`) instead of `getConnection`; `ChainConnectorSolStub` takes a network object only
  - `@talismn/balances`: `SolTransferCallData` is now kit `Instruction[]`; solana modules fetch via kit rpc; token-2022 transfer-hook extra-account resolution ported in (with tests)
  - `@talismn/solana`: rewritten on kit's transaction model (`messageBytes` + signatures map) — `parseTransactionInfo`, `serializeTransaction`/`deserializeTransaction` (legacy + v0), `buildUnsignedTransaction`, `setTransactionBlockhash`, `attachTransactionSignature`, `signTransactionWithSecretKey` (@noble ed25519, no Keypair/WebCrypto); adds `serializeOffchainMessage` (CLI/Ledger off-chain message envelope) and `getVerifiedTransactionSignature` (per-signer slot check, works on co-signed transactions); `parseTransactionInfo` now reports the fee payer's canonical signature

### Minor Changes

- 4f1ba49: Steady-state emission suppression and JS-thread friendliness for balance pipelines:

  - Stabilize IBalance object references across emissions (`stabilizeModuleResults`): unchanged balances keep their previous object identity, so fingerprint caches, `distinctUntilChanged` item compares and host-side memoization hit instead of re-serializing/re-rendering the full result set every block/poll.
  - substrate-dtao: tolerate sub-0.1% per-block drift of `meta.scaledAlphaPrice` (AMM price) and pending-root-claim accrual, which previously defeated every dedup stage and forced a full downstream re-emission every 6s poll.
  - BalancesProvider: coalesce near-simultaneous multi-network emissions (auditTime) and time-slice the aggregation (chunked stale-marking + k-way merge of pre-sorted per-network arrays instead of a full re-sort), yielding the JS thread on budget.
  - Balance: cache computed accessors (total/free/reserved/locked/transferable/unavailable/feePayable/rates) per instance, invalidated on hydrate — these run in hot sorting/summing loops and previously re-derived values and allocated several BalanceFormatters per access.

- 187a064: Migrate the substrate stack from @polkadot/\* to the polkadot-api ecosystem

  - `@talismn/chain-connectors`: `ChainConnectorDot` rebuilt on `@polkadot-api/ws-provider` + `substrate-client` (native endpoint failover, auto-resubscribe on reconnect, keep-alive, `StaleRpcError`); `asProvider()` removed; `@talismn/connection-meta` retired
  - `@talismn/sapi`: fee estimation and `CheckMetadataHash` payloads built with `@polkadot-api/tx-utils`/`signers-common`; pjs `TypeRegistry` helpers removed; `SignerPayloadJSON` type vendored
  - `@talismn/balances`: substrate-psp22 module ported off `@polkadot/api-contract` (hand-rolled selectors + scale codecs, byte-parity tested)
  - `@talismn/crypto`: adds `signSubstrate` (sr25519/ed25519/ecdsa/ethereum, pjs byte-parity), pjs keystore JSON encrypt/decrypt (scrypt + xsalsa20poly1305), sr25519 shared-secret helpers
  - `@talismn/util`: adds pjs-parity byte/hex helpers (`hexToU8a`, `u8aToHex`, `u8aWrapBytes`, …) and `assert`

### Patch Changes

- 64ba301: Preserve live status across balance pipeline restarts: seeds re-emit previously-live balances with their exact last live result instead of downgrading the snapshot to cache and back. Seeded live status expires after 5 minutes without a confirming module emission, and the periodic stale sweep downgrades seeded balances whose module never reconnects.
- 253ca85: bound in-memory caches: getSharedObservable entries are dropped when unused, sol-spl dynamic token metadata cache is LRU-bounded
- ffc679c: Fail dtao polls on transient RPC errors instead of resolving empty: conviction-lock and root-claim fetch failures previously read as "balance no longer exists", deleting the stored balance and making lock-only/claim-only rows (e.g. SN128) flap in and out of the portfolio on every other poll. Failed polls now mark balances stale, keeping rows rendered. Storage key encode failures (metadata drift) fail the poll the same way instead of reading as absent values.
- 4f1ba49: Fix a recurring ~1s JS-thread stall: `fetchRuntimeCallResult` ran the UNCACHED full
  metadata parse (~200ms, indivisible) whenever it was passed a raw metadata hex string —
  substrate-hydration does this once per address on every 6s poll. Now routed through
  `parseMetadataRpcCached` (as are the assets/foreignassets/hydration `fetchTokens` paths,
  which use the read-only builder). `getMiniMetadata` paths intentionally stay uncached:
  they pass the parsed metadata to `compactMetadata`, which mutates it in place.

  Also: balance drift (AMM price movement, root-claim accrual beyond tolerance) now
  re-emits at most once per 30s per balance instead of on every poll — a fast-accruing
  pending claim could previously defeat any relative tolerance and force a full pipeline
  pass every 6s.

- 4f1ba49: JS-thread stall attribution hooks:

  - `@talismn/util`: new `reportJsActivity(label, durMs?)` — reports to an optional host-installed `globalThis.__recordJsActivity` hook (no-op otherwise), so host apps running a JS-thread stall watchdog can attribute blocked time to library work. `createTimeSlicer`/`switchMapChunked`/`concatMapChunked` accept a `label` and report slices that ran ≥3× past their budget (a single indivisible work item blocked the thread).
  - `@talismn/balances`: labeled the chunked decode/aggregation pipelines, and reports full-metadata parses (`parseMetadataRpcCached` cache misses, with duration and cache pressure) and miniMetadata builds.

- 1502463: Coerce string-encoded `tokenDecimals` in substrate-native `system_properties` (fixes native token/balance fetch on chains like the reset Paseo relay whose node serializes numbers as strings)
- 4f1ba49: feat: balances chunking
- ffc679c: Fail storage query packs on an empty state_queryStorageAt response instead of decoding every key as absent
- 24fee4e: Upgrade to typescript 7, switch build tool from tsup to tsdown
- Updated dependencies [253ca85]
- Updated dependencies [921aee5]
- Updated dependencies [c714f08]
- Updated dependencies [5c5aa09]
- Updated dependencies [bd1581b]
- Updated dependencies [4f1ba49]
- Updated dependencies [7a68097]
- Updated dependencies [8939669]
- Updated dependencies [187a064]
- Updated dependencies [4f1ba49]
- Updated dependencies [f0abc19]
- Updated dependencies [921aee5]
- Updated dependencies [dccbbf8]
- Updated dependencies [82ba63a]
- Updated dependencies [ffc679c]
- Updated dependencies [24fee4e]
- Updated dependencies [793ec8a]
  - @talismn/util@2.0.0
  - @talismn/crypto@1.0.0
  - @talismn/chain-connectors@1.0.0
  - @talismn/chaindata-provider@2.0.0
  - @talismn/token-rates@4.0.0
  - @talismn/sapi@2.0.0
  - @talismn/scale@2.0.0

## 2.0.0

### Major Changes

- 1e434d5: migrate to polkadot-api v2

  BREAKING: the `Binary`/`FixedSizeBinary` classes are removed. Fixed-size `[u8; N]`
  fields (`AccountId32`, `AccountKey20`, …) now decode to `0x` hex strings (`SizedHex`)
  and variable-length `Vec<u8>` fields decode to `Uint8Array`. `@talismn/scale` drops
  the `FixedSizeBinary` re-export and adds `SizedHex`.

### Patch Changes

- Updated dependencies [1e434d5]
- Updated dependencies [3107f1b]
- Updated dependencies [1e434d5]
  - @talismn/scale@1.0.0
  - @talismn/sapi@1.0.0
  - @talismn/chaindata-provider@1.5.1
  - @talismn/chain-connectors@0.1.1
  - @talismn/token-rates@3.0.23

## 1.5.0

### Minor Changes

- 0a94c4b: bump dependencies
- 5133bff: minimetadata v11 - dtao conviction locks

  conviction locks are reported on the subnet's base (hotkey-less) token balance, as on-chain they constrain the coldkey's total alpha on the subnet rather than a specific staking position. The lock surfaces in the balance's locked amount but does not reduce its available/transferable amount (the locked stake remains transferable via transfer_stake), and `findDTaoConvictionLock` is exposed to read a balance's conviction lock

- bbf4fca: bump dependencies

### Patch Changes

- 91cdabe: bump bignumber.js to 11.1.3
- 5133bff: add `taoToAlphaCeil` for user-facing must-keep/must-send alpha minimums: the chain floors the alpha→TAO conversion when checking its TAO-denominated thresholds, so these minimums must round up — a floored value can sit one planck under the real bound and fail the check (or get the position force-swept) when met exactly
- 21809ee: apply biome lint autofixes (optional chaining); no behaviour change
- a0a1546: bump @solana/spl-token and @metaplex-foundation/umi (minor)
- aa5e55b: fix unsafe instanceOf usage
- 9aa9c72: build with typescript 6 (dev tooling). crypto/keyring type-compat fixes are byte-identical with no behaviour change
- 5133bff: expose the keyed hotkey on dtao conviction locks: `findDTaoConvictionLock` / `DTaoConvictionLockInfo` now return the lock's `hotkey` (also added to the conviction lock balance meta). This lets consumers top up an existing conviction lock, which the chain only allows against the lock's existing hotkey.
- b672e3a: bump viem to 2.52.2
- Updated dependencies [91cdabe]
- Updated dependencies [bc509f5]
- Updated dependencies [73ee8d7]
- Updated dependencies [c6ffb9c]
- Updated dependencies [0a94c4b]
- Updated dependencies [b9f92ab]
- Updated dependencies [ee110a0]
- Updated dependencies [ab11fa6]
- Updated dependencies [5133bff]
- Updated dependencies [b408b0c]
- Updated dependencies [aa5e55b]
- Updated dependencies [9aa9c72]
- Updated dependencies [7d99a0a]
- Updated dependencies [bbf4fca]
- Updated dependencies [b672e3a]
  - @talismn/util@1.1.0
  - @talismn/chaindata-provider@1.5.0
  - @talismn/crypto@0.3.5
  - @talismn/chain-connectors@0.1.0
  - @talismn/sapi@0.1.7
  - @talismn/scale@0.3.5
  - @talismn/token-rates@3.0.22

## 1.4.0

### Minor Changes

- f7ff987: token 2022

### Patch Changes

- 77a7bf8: chore: remove @polkadot/util and @polkadot/util-crypto
- Updated dependencies [9bb4b12]
- Updated dependencies [81a539b]
- Updated dependencies [0738101]
- Updated dependencies [77a7bf8]
- Updated dependencies [f7ff987]
- Updated dependencies [a02eefe]
  - @talismn/chaindata-provider@1.4.0
  - @talismn/chain-connectors@0.0.19
  - @talismn/sapi@0.1.6
  - @talismn/token-rates@3.0.21

## 1.3.6

### Patch Changes

- c83c063: fix: explicit vitest imports
- Updated dependencies [c83c063]
- Updated dependencies [c83c063]
- Updated dependencies [b3e61b3]
- Updated dependencies [2bdb305]
- Updated dependencies [95118f2]
  - @talismn/chaindata-provider@1.3.9
  - @talismn/chain-connectors@0.0.18
  - @talismn/crypto@0.3.4
  - @talismn/scale@0.3.4
  - @talismn/sapi@0.1.5
  - @talismn/util@1.0.1
  - @talismn/token-rates@3.0.20

## 1.3.5

### Patch Changes

- Updated dependencies [a37f6f9]
- Updated dependencies [185c24f]
  - @talismn/sapi@0.1.4
  - @talismn/chaindata-provider@1.3.8
  - @talismn/chain-connectors@0.0.17
  - @talismn/token-rates@3.0.19

## 1.3.4

### Patch Changes

- 6d4ee42: performance improvements + new tests
- e1a736f: cleanup dead code and exports
- a8a0727: bump papi deps
- Updated dependencies [6d4ee42]
- Updated dependencies [e1a736f]
- Updated dependencies [177feec]
- Updated dependencies [6577dce]
- Updated dependencies [7609ac1]
- Updated dependencies [9929e2d]
- Updated dependencies [51e0da6]
- Updated dependencies [e1a736f]
- Updated dependencies [19fd19d]
- Updated dependencies [a8a0727]
- Updated dependencies [6d4ee42]
  - @talismn/chaindata-provider@1.3.7
  - @talismn/chain-connectors@0.0.16
  - @talismn/token-rates@3.0.18
  - @talismn/crypto@0.3.3
  - @talismn/util@1.0.0
  - @talismn/scale@0.3.3
  - @talismn/sapi@0.1.3

## 1.3.3

### Patch Changes

- e70d6e6: fix: github url
- Updated dependencies [e70d6e6]
- Updated dependencies [2dd2339]
- Updated dependencies [e70d6e6]
- Updated dependencies [e70d6e6]
- Updated dependencies [e70d6e6]
  - @talismn/util@0.5.8
  - @talismn/chaindata-provider@1.3.6
  - @talismn/chain-connectors@0.0.15
  - @talismn/token-rates@3.0.17
  - @talismn/crypto@0.3.2
  - @talismn/scale@0.3.2
  - @talismn/sapi@0.1.2

## 1.3.2

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
  - @talismn/chain-connectors@0.0.14
  - @talismn/token-rates@3.0.16
  - @talismn/crypto@0.3.1
  - @talismn/scale@0.3.1
  - @talismn/sapi@0.1.1

## 1.3.1

### Patch Changes

- 332e20f: minimetadata v9
- 332e20f: fix tao root staking pending rewards calculation
- Updated dependencies [332e20f]
  - @talismn/chaindata-provider@1.3.4
  - @talismn/chain-connectors@0.0.13
  - @talismn/token-rates@3.0.15

## 1.3.0

### Minor Changes

- 4bb06de: Added Root claimable rewards to bittensor balances

### Patch Changes

- Updated dependencies [87f53ed]
- Updated dependencies [4bb06de]
  - @talismn/chaindata-provider@1.3.3
  - @talismn/chain-connectors@0.0.12
  - @talismn/token-rates@3.0.14

## 1.2.2

### Patch Changes

- Updated dependencies [b3b5ff5]
- Updated dependencies [b3b5ff5]
- Updated dependencies [0f26ccd]
  - @talismn/crypto@0.3.0
  - @talismn/scale@0.3.0
  - @talismn/sapi@0.1.0
  - @talismn/chaindata-provider@1.3.2
  - @talismn/solana@0.0.5
  - @talismn/chain-connectors@0.0.11
  - @talismn/token-rates@3.0.13

## 1.2.1

### Patch Changes

- Updated dependencies [7deed17]
- Updated dependencies [2c395d3]
- Updated dependencies [f97a95f]
- Updated dependencies [05e1e30]
- Updated dependencies [9b5618c]
  - @talismn/chaindata-provider@1.3.1
  - @talismn/solana@0.0.4
  - @talismn/util@0.5.6
  - @talismn/chain-connectors@0.0.10
  - @talismn/token-rates@3.0.12

## 1.2.0

### Minor Changes

- 4d24072: chaindata v7 (isTransferable on substrate-dtao tokens)

### Patch Changes

- 24e8511: fix: return stale balance in case of fetch error
- Updated dependencies [927f797]
- Updated dependencies [f603f41]
- Updated dependencies [e1e20e5]
- Updated dependencies [4d24072]
- Updated dependencies [1f4146c]
  - @talismn/chaindata-provider@1.3.0
  - @talismn/chain-connectors@0.0.9
  - @talismn/token-rates@3.0.11

## 1.1.0

### Minor Changes

- 75fb494: dtao tokens and balance modules

### Patch Changes

- Updated dependencies [c883b67]
- Updated dependencies [75fb494]
- Updated dependencies [165749d]
- Updated dependencies [72a1fa6]
  - @talismn/chaindata-provider@1.2.0
  - @talismn/token-rates@3.0.10
  - @talismn/chain-connectors@0.0.8

## 1.0.9

### Patch Changes

- b18f5f1: fix transfers on NeuroWeb
- Updated dependencies [8266e9c]
- Updated dependencies [ceaf004]
  - @talismn/chaindata-provider@1.1.6
  - @talismn/chain-connectors@0.0.7
  - @talismn/token-rates@3.0.9

## 1.0.8

### Patch Changes

- Updated dependencies [695a4a9]
- Updated dependencies [1cb2c51]
- Updated dependencies [af411b9]
- Updated dependencies [4493b28]
  - @talismn/chaindata-provider@1.1.5
  - @talismn/util@0.5.5
  - @talismn/chain-connectors@0.0.6
  - @talismn/token-rates@3.0.8

## 1.0.7

### Patch Changes

- 72acc04: chore: tidied up tsconfig.json
- Updated dependencies [16c2ee4]
- Updated dependencies [72acc04]
  - @talismn/sapi@0.0.12
  - @talismn/chaindata-provider@1.1.4
  - @talismn/chain-connectors@0.0.5
  - @talismn/token-rates@3.0.7
  - @talismn/crypto@0.2.3
  - @talismn/solana@0.0.3
  - @talismn/scale@0.2.2
  - @talismn/util@0.5.4

## 1.0.6

### Patch Changes

- f2d3cf5: pin p-queue lib version
- f2d3cf5: pin @types/lodash-es version
- Updated dependencies [cc3fa02]
- Updated dependencies [f2d3cf5]
- Updated dependencies [f2d3cf5]
  - @talismn/chaindata-provider@1.1.3
  - @talismn/util@0.5.3
  - @talismn/chain-connectors@0.0.4
  - @talismn/token-rates@3.0.6

## 1.0.5

### Patch Changes

- e399b86: chore: bump min nodejs version to 20
- Updated dependencies [0d38ece]
- Updated dependencies [e399b86]
  - @talismn/chaindata-provider@1.1.2
  - @talismn/chain-connectors@0.0.3
  - @talismn/token-rates@3.0.5
  - @talismn/crypto@0.2.2
  - @talismn/solana@0.0.2
  - @talismn/scale@0.2.1
  - @talismn/sapi@0.0.11
  - @talismn/util@0.5.2

## 1.0.4

### Patch Changes

- Updated dependencies [9869029]
  - @talismn/chaindata-provider@1.1.1
  - @talismn/chain-connectors@0.0.2
  - @talismn/token-rates@3.0.4

## 1.0.3

### Patch Changes

- daacbf1: auto detect new tokens
- af7cb29: fix transferAll for substrate assets and foreign assets
- a922bed: feat: swappable chaindata storage
- f0a103b: feat: updates for solana
- Updated dependencies [7b41204]
- Updated dependencies [f5e2f60]
- Updated dependencies [dfe2992]
- Updated dependencies [0c9b3c7]
- Updated dependencies [52b851c]
- Updated dependencies [8a31f57]
- Updated dependencies [f0a103b]
- Updated dependencies [a922bed]
- Updated dependencies [f0a103b]
  - @talismn/chaindata-provider@1.1.0
  - @talismn/util@0.5.1
  - @talismn/chain-connectors@0.0.1
  - @talismn/crypto@0.2.1
  - @talismn/solana@0.0.1
  - @talismn/sapi@0.0.10
  - @talismn/token-rates@3.0.3

## 1.0.2

### Patch Changes

- b2d069a: chore: zod compat with latest version
- Updated dependencies [045fc70]
- Updated dependencies [b2d069a]
- Updated dependencies [8b4d4ac]
  - @talismn/sapi@0.0.9
  - @talismn/chaindata-provider@1.0.2
  - @talismn/chain-connector@1.0.2
  - @talismn/chain-connector-evm@1.0.2
  - @talismn/token-rates@3.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [0ce0a11]
- Updated dependencies [51dba85]
  - @talismn/chaindata-provider@1.0.1
  - @talismn/sapi@0.0.8
  - @talismn/chain-connector@1.0.1
  - @talismn/chain-connector-evm@1.0.1
  - @talismn/token-rates@3.0.1

## 1.0.0

### Major Changes

- d2071a1: BREAKING: chaindata v4

### Minor Changes

- 411726c: new balance modules

### Patch Changes

- 4008626: pin minimetadata version
- ac5f1e3: fix: cache subscription results
- Updated dependencies [411726c]
- Updated dependencies [a5a3595]
- Updated dependencies [d2071a1]
- Updated dependencies [411726c]
- Updated dependencies [002af50]
- Updated dependencies [d2071a1]
- Updated dependencies [d2071a1]
- Updated dependencies [4008626]
- Updated dependencies [f6e9d24]
- Updated dependencies [0ff2f9d]
  - @talismn/chain-connector-evm@1.0.0
  - @talismn/chaindata-provider@1.0.0
  - @talismn/scale@0.2.0
  - @talismn/util@0.5.0
  - @talismn/token-rates@3.0.0
  - @talismn/chain-connector@1.0.0
  - @talismn/sapi@0.0.7

## 0.9.12

### Patch Changes

- Updated dependencies [f39d58e]
- Updated dependencies [f9cfd27]
- Updated dependencies [21bec07]
- Updated dependencies [2773be6]
  - @talismn/chaindata-provider@0.11.1
  - @talismn/sapi@0.0.6
  - @talismn/chain-connector@0.11.1
  - @talismn/chain-connector-evm@0.11.1
  - @talismn/token-rates@2.0.12

## 0.9.11

### Patch Changes

- 51c676b: fix: exports
- 549f1e5: fetchBestMetadata method
- Updated dependencies [549f1e5]
- Updated dependencies [ecd5c7a]
  - @talismn/sapi@0.0.5
  - @talismn/chaindata-provider@0.11.0
  - @talismn/chain-connector@0.11.0
  - @talismn/chain-connector-evm@0.11.0
  - @talismn/token-rates@2.0.11

## 0.9.10

### Patch Changes

- 78f3616: bump pjs and papi deps
- Updated dependencies [78f3616]
  - @talismn/chain-connector@0.10.9
  - @talismn/scale@0.1.2
  - @talismn/sapi@0.0.4
  - @talismn/util@0.4.2
  - @talismn/chain-connector-evm@0.10.9
  - @talismn/chaindata-provider@0.10.9
  - @talismn/token-rates@2.0.10

## 0.9.9

### Patch Changes

- Updated dependencies [cb55639]
  - @talismn/chaindata-provider@0.10.8
  - @talismn/chain-connector@0.10.8
  - @talismn/chain-connector-evm@0.10.8
  - @talismn/token-rates@2.0.9

## 0.9.8

### Patch Changes

- Updated dependencies [719c548]
  - @talismn/chaindata-provider@0.10.7
  - @talismn/chain-connector@0.10.7
  - @talismn/chain-connector-evm@0.10.7
  - @talismn/token-rates@2.0.8

## 0.9.7

### Patch Changes

- Updated dependencies [3255efb]
  - @talismn/chaindata-provider@0.10.6
  - @talismn/chain-connector@0.10.6
  - @talismn/chain-connector-evm@0.10.6
  - @talismn/token-rates@2.0.7

## 0.9.6

### Patch Changes

- Updated dependencies [729c4e4]
  - @talismn/chaindata-provider@0.10.5
  - @talismn/chain-connector@0.10.5
  - @talismn/chain-connector-evm@0.10.5
  - @talismn/token-rates@2.0.6

## 0.9.5

### Patch Changes

- Updated dependencies [16cb27c]
- Updated dependencies [f9cf545]
  - @talismn/chaindata-provider@0.10.4
  - @talismn/token-rates@2.0.5
  - @talismn/chain-connector@0.10.4
  - @talismn/chain-connector-evm@0.10.4

## 0.9.4

### Patch Changes

- Updated dependencies [794cd6c]
- Updated dependencies [3177848]
  - @talismn/chaindata-provider@0.10.3
  - @talismn/token-rates@2.0.4
  - @talismn/chain-connector@0.10.3
  - @talismn/chain-connector-evm@0.10.3

## 0.9.3

### Patch Changes

- caa72c3: poll erc20 balances network by network
- Updated dependencies [68f807a]
  - @talismn/util@0.4.1
  - @talismn/chain-connector@0.10.2
  - @talismn/chain-connector-evm@0.10.2
  - @talismn/chaindata-provider@0.10.2
  - @talismn/token-rates@2.0.3

## 0.9.2

### Patch Changes

- 378bd5e: fix: allow multiple substrate-tokens to have the same symbol
- b447fbf: chore: add SimpleEvmNetworkList
- Updated dependencies [a9b71ff]
- Updated dependencies [b447fbf]
  - @talismn/chaindata-provider@0.10.1
  - @talismn/chain-connector@0.10.1
  - @talismn/chain-connector-evm@0.10.1
  - @talismn/token-rates@2.0.2

## 0.9.1

### Patch Changes

- a16afbc: fix: use new token-rates api
- Updated dependencies [6c25807]
- Updated dependencies [ee16dc6]
- Updated dependencies [a16afbc]
- Updated dependencies [f33ab10]
  - @talismn/chaindata-provider@0.10.0
  - @talismn/chain-connector-evm@0.10.0
  - @talismn/token-rates@2.0.1
  - @talismn/sapi@0.0.3
  - @talismn/util@0.4.0
  - @talismn/chain-connector@0.10.0

## 0.9.0

### Minor Changes

- 71f6dbd: deprecate sortIndex properties

### Patch Changes

- c339aa7: feat: use papi for decoding bittensor runtime api types
- e704203: add: isNotNil and isTruthy utilities
- Updated dependencies [71f6dbd]
- Updated dependencies [c339aa7]
- Updated dependencies [ae7f0ac]
- Updated dependencies [e704203]
- Updated dependencies [c339aa7]
- Updated dependencies [71f6dbd]
  - @talismn/token-rates@2.0.0
  - @talismn/sapi@0.0.2
  - @talismn/chaindata-provider@0.9.0
  - @talismn/chain-connector@0.9.0
  - @talismn/util@0.3.2
  - @talismn/scale@0.1.1
  - @talismn/chain-connector-evm@0.9.0

## 0.8.2

### Patch Changes

- Updated dependencies [0357a93]
  - @talismn/chaindata-provider@0.8.4
  - @talismn/chain-connector@0.8.4
  - @talismn/chain-connector-evm@0.8.4
  - @talismn/token-rates@1.0.4

## 0.8.1

### Patch Changes

- Updated dependencies [5f29d37]
  - @talismn/chaindata-provider@0.8.3
  - @talismn/chain-connector@0.8.3
  - @talismn/chain-connector-evm@0.8.3
  - @talismn/token-rates@1.0.3

## 0.8.0

### Minor Changes

- 0636646: fix getValueId coercing 0 to falsy when evaluating subtensor balance

## 0.7.2

### Patch Changes

- 042d340: chore: convert subtensor staking WARNs to TRACEs
- Updated dependencies [bcf9520]
  - @talismn/chaindata-provider@0.8.2
  - @talismn/chain-connector@0.8.2
  - @talismn/chain-connector-evm@0.8.2
  - @talismn/token-rates@1.0.2

## 0.7.1

### Patch Changes

- Updated dependencies [9c4a335]
- Updated dependencies [e83310e]
  - @talismn/util@0.3.1
  - @talismn/chaindata-provider@0.8.1
  - @talismn/chain-connector@0.8.1
  - @talismn/chain-connector-evm@0.8.1
  - @talismn/token-rates@1.0.1

## 0.7.0

### Minor Changes

- 703566b: fix: equilibrium/genshiro duplicated balances
- fdc3740: bump viem
- 1e69fd7: bump deps
- e4c41df: noDiscovery property on tokens
- 84dd6ac: update to new tokenRates shape
- 71cbd2d: chore: viem v2
- 97c8cda: remove symbol from native token ids
- 908baf2: Add nomination pool ID to balance metadata
- 228eb68: feat: custom user extensions support
- 89e4533: bump papi
- 69ba869: reserved nompool staking
- fdc3740: use erc20 aggregator
- d257ab5: chore: bump viem
- a127d6c: Added dTao staking balances and Alpha to Tao price calculations
- 176139a: Added alpha to tao token rate, changed "amountTao" to "amountStake" for clarity
- 998e610: subtensor hotkey in balance meta

### Patch Changes

- 771a5be: fix: incorrect cached/stale balances for evm accounts
- 07f348b: feat: evm-uniswapv2 tokens
- 42567c0: fix: support `Fungible` available balance calculation
- 59ecc3d: feat: show unbonding status for native staking balances
- 5d833e8: chore: small cleanup of ChaindataProviderExtension method names
- d2ccdaf: fix: balance subscriptions never update registry cache with new metadata
- 911f932: fix: papify nompoolAccountId util
- 6021b64: feat: add subtensor delegated staking
- 64e4344: bump deps
- 122f828: rename "direct staking" => "delegated staking"
- 8b5f619: fix: don't delete cached balances when upgrading from a cephalopoded chaindata
- c8a27b3: Dedexifiction of balances
- a839969: prevent unnecessary erc20 balance change callbacks
- e75f799: chore: upgrade polkadot-js dependencies
- a25771e: prettier fix
- 1d9c88a: fix: frozen token amounts in `SubAssetsModule`
- a868f95: fix: clear balance db if migration error
- 89e7b6b: feat: support foreign assets pallet
- 372f995: replace ethers by viem
- c4d5967: bump typescript version
- a916db0: docs: added @talismn/balances readme
- 9623582: Fix bug causing duplicated balances
- a3a1bd7: feat: psp22 balances module
- c36375f: Use Balances::transfer_allow_death as default method for substrate balance transfers
- ea4d120: feat: migrated to scale-ts
- c8a27b3: Improve typing of tokens property on BalanceModule
- 620b7eb: Dependency updates
- aec0216: typing fix
- 70760fd: Fixed dTao staked balances fetching
- f830db3: fix: crowdloans & nom pool staking
- 828698b: fix: upgraded papi
- 5aadf99: fix: renamed renamed Unknown -> Unit for tokens with no symbol
- aec0216: typings
- 5aadf99: feat: native token balances on custom networks
- f44f560: feat: azns lookups
- d981017: fix: rename univ2 poolAddress -> contractAddress
- afb0284: feat: upgraded @talismn/balances-react to support new chaindata
- d58d1a2: Update chaindata hydration, and minimetadata fetching, to be less blocking
- d3aedfb: feat: support dTAO staking balances
- 05ca588: feat: migrated to pnpm
- 90f42b7: feat: parameterise orml tokens palletId
- 4b830e8: Update for extension manifest v3
- aca1ab0: fix: hydrate chains before mini metadata
- Updated dependencies [123647e]
- Updated dependencies [42567c0]
- Updated dependencies [0339e5e]
- Updated dependencies [2ef26d2]
- Updated dependencies [e4c41df]
- Updated dependencies [d981017]
- Updated dependencies [5d833e8]
- Updated dependencies [03939d5]
- Updated dependencies [1e77eeb]
- Updated dependencies [d2ccdaf]
- Updated dependencies [123647e]
- Updated dependencies [68bf06a]
- Updated dependencies [d58d1a2]
- Updated dependencies [64e4344]
- Updated dependencies [fdc3740]
- Updated dependencies [5b747e8]
- Updated dependencies [5048f86]
- Updated dependencies [c8a27b3]
- Updated dependencies [b82777a]
- Updated dependencies [1e69fd7]
- Updated dependencies [d20764a]
- Updated dependencies [e75f799]
- Updated dependencies [89e4533]
- Updated dependencies [a25771e]
- Updated dependencies [5a54fd6]
- Updated dependencies [f926b14]
- Updated dependencies [be0d19e]
- Updated dependencies [71cbd2d]
- Updated dependencies [603bc1e]
- Updated dependencies [e0eb84a]
- Updated dependencies [122f828]
- Updated dependencies [89e7b6b]
- Updated dependencies [97c8cda]
- Updated dependencies [66a31f4]
- Updated dependencies [ade2908]
- Updated dependencies [372f995]
- Updated dependencies [c4d5967]
- Updated dependencies [6973d01]
- Updated dependencies [f2f68f3]
- Updated dependencies [d58d1a2]
- Updated dependencies [84dd6ac]
- Updated dependencies [d257ab5]
- Updated dependencies [fdc3740]
- Updated dependencies [1eacbbc]
- Updated dependencies [776432e]
- Updated dependencies [d11555c]
- Updated dependencies [2c865c4]
- Updated dependencies [b024b64]
- Updated dependencies [ea4d120]
- Updated dependencies [23f0d3a]
- Updated dependencies [e0eb84a]
- Updated dependencies [620b7eb]
- Updated dependencies [850381a]
- Updated dependencies [828698b]
- Updated dependencies [dc0eaeb]
- Updated dependencies [14483ac]
- Updated dependencies [48c7374]
- Updated dependencies [b6f986f]
- Updated dependencies [114d885]
- Updated dependencies [5aadf99]
- Updated dependencies [88e86c6]
- Updated dependencies [fd7f109]
- Updated dependencies [fdc3740]
- Updated dependencies [b5a3f7d]
- Updated dependencies [4cace80]
- Updated dependencies [89e4533]
- Updated dependencies [d981017]
- Updated dependencies [0f4def6]
- Updated dependencies [afb0284]
- Updated dependencies [a6c1b2a]
- Updated dependencies [d257ab5]
- Updated dependencies [d58d1a2]
- Updated dependencies [1a8818a]
- Updated dependencies [65fbb98]
- Updated dependencies [d3aedfb]
- Updated dependencies [fe275d9]
- Updated dependencies [6d9e378]
- Updated dependencies [84dd6ac]
- Updated dependencies [05ca588]
- Updated dependencies [4b830e8]
- Updated dependencies [6489a32]
- Updated dependencies [d2fdbba]
- Updated dependencies [1da5992]
- Updated dependencies [f5eab24]
- Updated dependencies [95ff715]
- Updated dependencies [372f995]
- Updated dependencies [fdc3740]
- Updated dependencies [9ebcd93]
  - @talismn/token-rates@1.0.0
  - @talismn/chaindata-provider@0.8.0
  - @talismn/scale@0.1.0
  - @talismn/chain-connector-evm@0.8.0
  - @talismn/chain-connector@0.8.0
  - @talismn/util@0.3.0

## 0.6.0

### Minor Changes

- b920ab98: Added GPL licence

### Patch Changes

- 3c1a8b10: Dependency updates
- Updated dependencies [2d0ae30b]
- Updated dependencies [3c1a8b10]
- Updated dependencies [b920ab98]
- Updated dependencies [7573864f]
  - @talismn/util@0.2.0
  - @talismn/chaindata-provider@0.7.0
  - @talismn/token-rates@0.2.0
  - @talismn/chain-connector-evm@0.7.0
  - @talismn/chain-connector@0.7.0

## 0.5.0

### Patch Changes

- @talismn/chain-connector@0.6.0
- @talismn/chain-connector-evm@0.6.0
- @talismn/chaindata-provider@0.6.0
- @talismn/token-rates@0.1.18

## 0.4.2

### Patch Changes

- Updated dependencies [1a2fdc73]
  - @talismn/chaindata-provider@0.5.0
  - @talismn/chain-connector@0.5.0
  - @talismn/chain-connector-evm@0.5.0
  - @talismn/token-rates@0.1.17

## 0.4.1

### Patch Changes

- fb8ee962: feat: proxy dapp websocket requests to talisman wallet backend when available
- f7aca48b: eslint rules
- 01bf239b: feat: crowdloan and nom pool balances
- 48f0222e: fix: removed some explicit `any`s
- 01bf239b: fix: packages publishing with incorrect interdependency versions
- Updated dependencies [fb8ee962]
- Updated dependencies [c898da98]
- Updated dependencies [f7aca48b]
- Updated dependencies [01bf239b]
- Updated dependencies [48f0222e]
- Updated dependencies [01bf239b]
  - @talismn/chain-connector@0.4.4
  - @talismn/chain-connector-evm@0.4.4
  - @talismn/chaindata-provider@0.4.4
  - @talismn/token-rates@0.1.16
  - @talismn/util@0.1.9

## 0.4.0

### Patch Changes

- 3068bd60: feat: stale balances and exponential rpc backoff
- 6643a4e4: fix: tokenRates in @talismn/balances-react
- 6643a4e4: fix: ported useDbCache related perf fixes to @talismn/balances-react
- Updated dependencies [3068bd60]
- Updated dependencies [6643a4e4]
- Updated dependencies [79f6ccf6]
- Updated dependencies [c24dc1fb]
  - @talismn/chain-connector@0.4.3
  - @talismn/util@0.1.8
  - @talismn/token-rates@0.1.15
  - @talismn/chaindata-provider@0.4.3
  - @talismn/chain-connector-evm@0.4.3

## 0.3.3

### Patch Changes

- c651551c: build: move `@polkadot` dependencies to `peerDependencies`
- Updated dependencies [c651551c]
  - @talismn/chain-connector@0.4.2
  - @talismn/util@0.1.7
  - @talismn/chain-connector-evm@0.4.2
  - @talismn/chaindata-provider@0.4.2
  - @talismn/token-rates@0.1.14

## 0.3.2

## 0.3.1

### Patch Changes

- 8adc7f06: feat: switched build tool to preconstruct
- Updated dependencies [8adc7f06]
- Updated dependencies [cfe8d276]
  - @talismn/chain-connector-evm@0.4.1
  - @talismn/chaindata-provider@0.4.1
  - @talismn/chain-connector@0.4.1
  - @talismn/token-rates@0.1.13
  - @talismn/util@0.1.6

## 0.3.0

### Minor Changes

- a63dbb3: exclude mirror tokens in sums

### Patch Changes

- 4aa691d: feat: new balance modules
- Updated dependencies [4aa691d]
- Updated dependencies [cd6a684]
- Updated dependencies [a63dbb3]
  - @talismn/chain-connector-evm@0.4.0
  - @talismn/chaindata-provider@0.2.1
  - @talismn/chain-connector@0.2.1
  - @talismn/token-rates@0.1.12
  - @talismn/util@0.1.5

## 0.2.3

## 0.2.2

### Patch Changes

- Updated dependencies [931b6ca]
  - @talismn/chain-connector-evm@0.3.0
  - @talismn/chain-connector@0.2.0
  - @talismn/chaindata-provider@0.2.0
  - @talismn/token-rates@0.1.11

## 0.2.1

## 0.2.0

### Patch Changes

- Updated dependencies [bff217a1]
- Updated dependencies [bff217a1]
  - @talismn/chain-connector-evm@0.2.0

## 0.1.19

## 0.1.18

### Patch Changes

- fix: a variety of improvements from the wallet integration
- Updated dependencies
  - @talismn/chain-connector@0.1.10
  - @talismn/chain-connector-evm@0.1.10
  - @talismn/chaindata-provider@0.1.10
  - @talismn/token-rates@0.1.10
  - @talismn/util@0.1.4

## 0.1.17

### Patch Changes

- Updated dependencies [8ecb8214]
  - @talismn/chaindata-provider@0.1.9
  - @talismn/chain-connector@0.1.9
  - @talismn/chain-connector-evm@0.1.9
  - @talismn/token-rates@0.1.9

## 0.1.16

### Patch Changes

- Updated dependencies [d13f514]
  - @talismn/chain-connector@0.1.8
  - @talismn/chaindata-provider@0.1.8
  - @talismn/chain-connector-evm@0.1.8
  - @talismn/token-rates@0.1.8

## 0.1.15

## 0.1.14

## 0.1.13

### Patch Changes

- Updated dependencies [db04d0d]
  - @talismn/token-rates@0.1.7
  - @talismn/chain-connector@0.1.7
  - @talismn/chaindata-provider@0.1.7
  - @talismn/chain-connector-evm@0.1.7

## 0.1.12

### Patch Changes

- ca50757: feat: implemented token fiat rates in @talismn/balances
- Updated dependencies [ca50757]
  - @talismn/chaindata-provider@0.1.6
  - @talismn/token-rates@0.1.6
  - @talismn/chain-connector@0.1.6
  - @talismn/chain-connector-evm@0.1.6

## 0.1.11

## 0.1.10

### Patch Changes

- 850a4d0: fix: access property of undefined error

## 0.1.9

### Patch Changes

- d66c5bc: fix: evm native tokens
- Updated dependencies [d66c5bc]
  - @talismn/chain-connector-evm@0.1.5
  - @talismn/chaindata-provider@0.1.5
  - @talismn/chain-connector@0.1.5
  - @talismn/token-rates@0.1.5

## 0.1.8

### Patch Changes

- 3db774a: fix: useBalances creating too many subscriptions when called from multiple components

## 0.1.7

## 0.1.6

## 0.1.5

### Patch Changes

- @talismn/chain-connector@0.1.4
- @talismn/chaindata-provider@0.1.4
- @talismn/token-rates@0.1.4

## 0.1.4

### Patch Changes

- d5f69f7: fix: migrated orml token code into substrate orml module
- Updated dependencies [d5f69f7]
  - @talismn/chaindata-provider@0.1.3
  - @talismn/chain-connector@0.1.3
  - @talismn/token-rates@0.1.3

## 0.1.3

### Patch Changes

- 5af305c: switched build output from esm to commonjs for ecosystem compatibility
- Updated dependencies [5af305c]
  - @talismn/chain-connector@0.1.2
  - @talismn/chaindata-provider@0.1.2
  - @talismn/token-rates@0.1.2
  - @talismn/util@0.1.3

## 0.1.2

### Patch Changes

- 2ccd51b: feat: implemented @talismn/balances-substrate-native
- Updated dependencies [2ccd51b]
  - @talismn/util@0.1.2

## 0.1.1

### Patch Changes

- Fixed publish config
- Updated dependencies
  - @talismn/chain-connector@0.1.1
  - @talismn/chaindata-provider@0.1.1
  - @talismn/token-rates@0.1.1
  - @talismn/util@0.1.1

## 0.1.0

### Minor Changes

- 43c1a3a: Initial release

### Patch Changes

- Updated dependencies [43c1a3a]
  - @talismn/chain-connector@0.1.0
  - @talismn/chaindata-provider@0.1.0
  - @talismn/token-rates@0.1.0
  - @talismn/util@0.1.0
