# @talismn/chaindata-provider

## 1.3.3

### Patch Changes

- 87f53ed: prepare release (gen init data)
- 4bb06de: generate init data

## 1.3.2

### Patch Changes

- 0f26ccd: init data

## 1.3.1

### Patch Changes

- 7deed17: generate init data
- 2c395d3: init data
- 9b5618c: init chain data
- Updated dependencies [05e1e30]
  - @talismn/util@0.5.6

## 1.3.0

### Minor Changes

- 4d24072: chaindata v7 (isTransferable on substrate-dtao tokens)

### Patch Changes

- 927f797: generate init data
- f603f41: fix taostats urls
- e1e20e5: update init data
- 1f4146c: remove aleph-zero from init data

## 1.2.0

### Minor Changes

- 75fb494: dtao tokens and balance modules

### Patch Changes

- c883b67: generate init data
- 165749d: update init data

## 1.1.6

### Patch Changes

- 8266e9c: init data
- ceaf004: init chaindata

## 1.1.5

### Patch Changes

- 695a4a9: init data
- af411b9: init chaindata
- 4493b28: init data
- Updated dependencies [1cb2c51]
  - @talismn/util@0.5.5

## 1.1.4

### Patch Changes

- 72acc04: chore: tidied up tsconfig.json
- Updated dependencies [72acc04]
  - @talismn/util@0.5.4

## 1.1.3

### Patch Changes

- cc3fa02: generate init data
- f2d3cf5: pin @types/lodash-es version
- Updated dependencies [f2d3cf5]
- Updated dependencies [f2d3cf5]
  - @talismn/util@0.5.3

## 1.1.2

### Patch Changes

- 0d38ece: generate init data
- e399b86: chore: bump min nodejs version to 20
- Updated dependencies [e399b86]
  - @talismn/util@0.5.2

## 1.1.1

### Patch Changes

- 9869029: generate init data

## 1.1.0

### Minor Changes

- f0a103b: add getBlockExplorerUrls and getBlockExplorerLabel

### Patch Changes

- 7b41204: update init data
- f5e2f60: chore: updated types & added sync hook for wallet swaps
- 0c9b3c7: generate init data
- 8a31f57: generate init data
- a922bed: feat: swappable chaindata storage
- f0a103b: feat: updates for solana
- Updated dependencies [dfe2992]
- Updated dependencies [a922bed]
- Updated dependencies [f0a103b]
  - @talismn/util@0.5.1

## 1.0.2

### Patch Changes

- b2d069a: chore: zod compat with latest version
- 8b4d4ac: generate init data

## 1.0.1

### Patch Changes

- 0ce0a11: generate init data

## 1.0.0

### Major Changes

- d2071a1: BREAKING: chaindata v4

### Minor Changes

- 411726c: new balance modules
- 411726c: add hydration module
- d2071a1: removed support for onfinality api keys

### Patch Changes

- 002af50: add missing exports
- 4008626: pin minimetadata version
- 0ff2f9d: generate init data

## 0.11.1

### Patch Changes

- f39d58e: generate init data
- f9cfd27: generate init data
- 21bec07: chore: added blockExplorerUrls to Chain.ts

## 0.11.0

### Minor Changes

- ecd5c7a: feat: chaindata v3

## 0.10.9

## 0.10.8

### Patch Changes

- cb55639: generate init data

## 0.10.7

### Patch Changes

- 719c548: generate init data

## 0.10.6

### Patch Changes

- 3255efb: chore: generate init data

## 0.10.5

### Patch Changes

- 729c4e4: generate init data

## 0.10.4

### Patch Changes

- 16cb27c: generate init data

## 0.10.3

### Patch Changes

- 794cd6c: generate init data

## 0.10.2

## 0.10.1

### Patch Changes

- a9b71ff: generate init data
- b447fbf: chore: add SimpleEvmNetworkList

## 0.10.0

### Minor Changes

- ee16dc6: feat: preserveGasEstimate on EvmNetwork

### Patch Changes

- 6c25807: generate init data

## 0.9.0

### Minor Changes

- 71f6dbd: deprecate sortIndex properties

### Patch Changes

- ae7f0ac: generate init data

## 0.8.4

### Patch Changes

- 0357a93: generate init data

## 0.8.3

### Patch Changes

- 5f29d37: generate init data

## 0.8.2

### Patch Changes

- bcf9520: generate init data

## 0.8.1

### Patch Changes

- e83310e: generate init data

## 0.8.0

### Minor Changes

- e4c41df: new noDiscovery property on tokens
- fdc3740: bump viem
- 97c8cda: remove symbol from native token ids
- f2f68f3: oldPrefix property on Chain
- d257ab5: feat: l2FeeType and feeType on EvmNetworks
- 48c7374: feat: ledger generic app
- fdc3740: add erc20aggregator on EvmNetwork
- d257ab5: chore: bump viem
- 65fbb98: feat: signedExtensions and registryTypes on Chain type
- d2fdbba: deprecated get entity with an object filter
  added chainByGenesisHash method
- 1da5992: feat: forceScan flag on EvmNetwork
- fdc3740: fix: update balancesConfig on custom evm networks when hydrating

### Patch Changes

- 42567c0: fix: support `Fungible` available balance calculation
- 0339e5e: Prevent Dexie errors
- 2ef26d2: Ensure Dexie async methods all awaited
- 5d833e8: chore: small cleanup of ChaindataProviderExtension method names
- 03939d5: fix: added githubUnknownChainLogoUrl
- 1e77eeb: fix: moved net into its own submodule for easier mocking
- d2ccdaf: fix: balance subscriptions never update registry cache with new metadata
- 64e4344: bump deps
- 5048f86: Update init data
- c8a27b3: Dedexifiction of balances
- d20764a: fix: unawaited promise
- a25771e: prettier fix
- 5a54fd6: Update init data
- f926b14: Update init data
- 603bc1e: feat: added `Chain.hasExtrinsicSignatureTypePrefix` property
- 89e7b6b: feat: support foreign assets pallet
- 66a31f4: Update init data
- ade2908: feat: added chainType to `Chain` type definition
- c4d5967: bump typescript version
- d58d1a2: Update init data
- 776432e: build: use type import for types only library
- 2c865c4: Update init data
- b024b64: generate init data
- ea4d120: feat: migrated to scale-ts
- 23f0d3a: chore: updated init data
- 620b7eb: Dependency updates
- dc0eaeb: update init data
- 14483ac: update init data
- b6f986f: update init data
- 114d885: fix: typings
- 5aadf99: feat: native token balances on custom networks
- fd7f109: Update init data
- b5a3f7d: Update init data
- 4cace80: add: dcentName property on tokens
- d981017: fix: rename univ2 poolAddress -> contractAddress
- 0f4def6: Change types for EVM network to allow 'SimpleEvmNetwork' type for use in frontend
- afb0284: feat: upgraded @talismn/balances-react to support new chaindata
- 1a8818a: Update init data
- fe275d9: Update init data
- 6d9e378: fix: remap lookup ids when building miniMetadatas
- 05ca588: feat: migrated to pnpm
- 4b830e8: Update for extension manifest v3

## 0.7.0

### Minor Changes

- b920ab98: Added GPL licence

### Patch Changes

- 3c1a8b10: Dependency updates

## 0.6.0

## 0.5.0

### Minor Changes

- 1a2fdc73: feat: add isUnknownFeeToken on Chain

## 0.4.4

### Patch Changes

- f7aca48b: eslint rules
- 48f0222e: fix: removed some explicit `any`s
- 01bf239b: fix: packages publishing with incorrect interdependency versions

## 0.4.3

### Patch Changes

- 79f6ccf6: added latestMetadataQrUrl to chaindata chains
- c24dc1fb: feat: added themeColor property to chains, evmNetworks, tokens

## 0.4.2

## 0.4.1

### Patch Changes

- 8adc7f06: feat: switched build tool to preconstruct

## 0.2.1

### Patch Changes

- 4aa691d: feat: new balance modules

## 0.2.0

## 0.1.10

### Patch Changes

- fix: a variety of improvements from the wallet integration

## 0.1.9

### Patch Changes

- 8ecb8214: fix: get token logo urls from chaindata-provider

## 0.1.8

## 0.1.7

## 0.1.6

### Patch Changes

- ca50757: feat: implemented token fiat rates in @talismn/balances

## 0.1.5

### Patch Changes

- d66c5bc: fix: evm native tokens

## 0.1.4

## 0.1.3

### Patch Changes

- d5f69f7: fix: migrated orml token code into substrate orml module

## 0.1.2

### Patch Changes

- 5af305c: switched build output from esm to commonjs for ecosystem compatibility

## 0.1.1

### Patch Changes

- Fixed publish config

## 0.1.0

### Minor Changes

- 43c1a3a: Initial release
