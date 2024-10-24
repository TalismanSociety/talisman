# @talismn/balances

## 0.7.0

### Minor Changes

- 703566b: fix: equilibrium/genshiro duplicated balances
- fdc3740: bump viem
- 71cbd2d: chore: viem v2
- 97c8cda: remove symbol from native token ids
- 908baf2: Add nomination pool ID to balance metadata
- 228eb68: feat: custom user extensions support
- fdc3740: use erc20 aggregator
- d257ab5: chore: bump viem

### Patch Changes

- 771a5be: fix: incorrect cached/stale balances for evm accounts
- 07f348b: feat: evm-uniswapv2 tokens
- 42567c0: fix: support `Fungible` available balance calculation
- 59ecc3d: feat: show unbonding status for native staking balances
- 5d833e8: chore: small cleanup of ChaindataProviderExtension method names
- d2ccdaf: fix: balance subscriptions never update registry cache with new metadata
- 911f932: fix: papify nompoolAccountId util
- 6021b64: feat: add subtensor delegated staking
- 8b5f619: fix: don't delete cached balances when upgrading from a cephalopoded chaindata
- c8a27b3: Dedexifiction of balances
- a839969: prevent unnecessary erc20 balance change callbacks
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
- f830db3: fix: crowdloans & nom pool staking
- 5aadf99: fix: renamed renamed Unknown -> Unit for tokens with no symbol
- aec0216: typings
- 5aadf99: feat: native token balances on custom networks
- f44f560: feat: azns lookups
- d981017: fix: rename univ2 poolAddress -> contractAddress
- afb0284: feat: upgraded @talismn/balances-react to support new chaindata
- d58d1a2: Update chaindata hydration, and minimetadata fetching, to be less blocking
- 05ca588: feat: migrated to pnpm
- 4b830e8: Update for extension manifest v3
- aca1ab0: fix: hydrate chains before mini metadata
- Updated dependencies [123647e]
- Updated dependencies [42567c0]
- Updated dependencies [0339e5e]
- Updated dependencies [2ef26d2]
- Updated dependencies [d981017]
- Updated dependencies [5d833e8]
- Updated dependencies [03939d5]
- Updated dependencies [1e77eeb]
- Updated dependencies [d2ccdaf]
- Updated dependencies [123647e]
- Updated dependencies [68bf06a]
- Updated dependencies [d58d1a2]
- Updated dependencies [fdc3740]
- Updated dependencies [5b747e8]
- Updated dependencies [5048f86]
- Updated dependencies [c8a27b3]
- Updated dependencies [b82777a]
- Updated dependencies [be0d19e]
- Updated dependencies [71cbd2d]
- Updated dependencies [603bc1e]
- Updated dependencies [e0eb84a]
- Updated dependencies [89e7b6b]
- Updated dependencies [97c8cda]
- Updated dependencies [ade2908]
- Updated dependencies [372f995]
- Updated dependencies [c4d5967]
- Updated dependencies [d58d1a2]
- Updated dependencies [d257ab5]
- Updated dependencies [fdc3740]
- Updated dependencies [1eacbbc]
- Updated dependencies [776432e]
- Updated dependencies [d11555c]
- Updated dependencies [2c865c4]
- Updated dependencies [ea4d120]
- Updated dependencies [23f0d3a]
- Updated dependencies [e0eb84a]
- Updated dependencies [620b7eb]
- Updated dependencies [850381a]
- Updated dependencies [48c7374]
- Updated dependencies [5aadf99]
- Updated dependencies [88e86c6]
- Updated dependencies [fdc3740]
- Updated dependencies [4cace80]
- Updated dependencies [d981017]
- Updated dependencies [afb0284]
- Updated dependencies [a6c1b2a]
- Updated dependencies [d257ab5]
- Updated dependencies [d58d1a2]
- Updated dependencies [65fbb98]
- Updated dependencies [6d9e378]
- Updated dependencies [05ca588]
- Updated dependencies [4b830e8]
- Updated dependencies [6489a32]
- Updated dependencies [d2fdbba]
- Updated dependencies [f5eab24]
- Updated dependencies [95ff715]
- Updated dependencies [372f995]
- Updated dependencies [fdc3740]
- Updated dependencies [9ebcd93]
  - @talismn/token-rates@0.3.0
  - @talismn/chaindata-provider@0.8.0
  - @talismn/scale@0.0.2
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
