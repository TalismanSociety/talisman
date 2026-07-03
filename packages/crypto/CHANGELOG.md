# @talismn/crypto

## 0.3.5

### Patch Changes

- 73ee8d7: bump @noble/ciphers to 2.2.0 and mlkem to 2.7.0
- ab11fa6: bump @noble/curves + @noble/hashes to 2.2 and @scure/base/bip32/bip39 to 2.2; port sr25519 derivation from micro-sr25519 to @scure/sr25519. Derivation outputs verified byte-identical.
- 9aa9c72: build with typescript 6 (dev tooling). crypto/keyring type-compat fixes are byte-identical with no behaviour change

## 0.3.4

### Patch Changes

- c83c063: fix: explicit vitest imports

## 0.3.3

### Patch Changes

- 177feec: bittensor mev shield update
- e1a736f: fix comment

## 0.3.2

### Patch Changes

- e70d6e6: fix: github url

## 0.3.1

### Patch Changes

- dd51038: apply biome lint suggestions
- bd74d55: github url in package.json
- 1977d5d: fix typescript config for tests
- 250839f: migration from preconstruct to tsup
- 250839f: migrate eslint+prettier to biome

## 0.3.0

### Minor Changes

- b3b5ff5: bittensor mev shield
- b3b5ff5: update dependencies

## 0.2.3

### Patch Changes

- 72acc04: chore: tidied up tsconfig.json

## 0.2.2

### Patch Changes

- e399b86: chore: bump min nodejs version to 20

## 0.2.1

### Patch Changes

- a922bed: feat: swappable chaindata storage
- f0a103b: feat: updates for solana

## 0.2.0

### Minor Changes

- a5a3595: shared utilities

## 0.1.5

### Patch Changes

- 78f3616: bump pjs and papi deps

## 0.1.4

### Patch Changes

- 3b10752: fix: isAddressEqual to return false if addresses are invalid

## 0.1.3

### Patch Changes

- a16afbc: fix: use new token-rates api

## 0.1.2

### Patch Changes

- e2c56bd: feat: use `crypto.subtle` instead of `@noble/hashes` for pbkdf2 inside of `entropyToSeed` for increased key derivation performance on mobile

## 0.1.1

### Patch Changes

- a618c64: fix: support for ed25519 accounts imported via polkadot-js

## 0.1.0

### Minor Changes

- 1fc1301: custom keyring init
