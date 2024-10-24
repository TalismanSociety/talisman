# @talismn/chaindata-provider

## 0.8.0

### Minor Changes

- fdc3740: bump viem
- 97c8cda: remove symbol from native token ids
- d257ab5: feat: l2FeeType and feeType on EvmNetworks
- 48c7374: feat: ledger generic app
- fdc3740: add erc20aggregator on EvmNetwork
- d257ab5: chore: bump viem
- 65fbb98: feat: signedExtensions and registryTypes on Chain type
- d2fdbba: deprecated get entity with an object filter
  added chainByGenesisHash method
- fdc3740: fix: update balancesConfig on custom evm networks when hydrating

### Patch Changes

- 42567c0: fix: support `Fungible` available balance calculation
- 0339e5e: Prevent Dexie errors
- 2ef26d2: Ensure Dexie async methods all awaited
- 5d833e8: chore: small cleanup of ChaindataProviderExtension method names
- 03939d5: fix: added githubUnknownChainLogoUrl
- 1e77eeb: fix: moved net into its own submodule for easier mocking
- d2ccdaf: fix: balance subscriptions never update registry cache with new metadata
- 5048f86: Update init data
- c8a27b3: Dedexifiction of balances
- 603bc1e: feat: added `Chain.hasExtrinsicSignatureTypePrefix` property
- 89e7b6b: feat: support foreign assets pallet
- ade2908: feat: added chainType to `Chain` type definition
- c4d5967: bump typescript version
- d58d1a2: Update init data
- 776432e: build: use type import for types only library
- 2c865c4: Update init data
- ea4d120: feat: migrated to scale-ts
- 23f0d3a: chore: updated init data
- 620b7eb: Dependency updates
- 5aadf99: feat: native token balances on custom networks
- 4cace80: add: dcentName property on tokens
- d981017: fix: rename univ2 poolAddress -> contractAddress
- afb0284: feat: upgraded @talismn/balances-react to support new chaindata
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
