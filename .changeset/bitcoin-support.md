---
"@talismn/bitcoin": minor
"@talismn/crypto": minor
"@talismn/keyring": minor
"@talismn/chaindata-provider": minor
"@talismn/chain-connectors": minor
"@talismn/balances": minor
"@talismn/orb": patch
---

Add Bitcoin as a fourth chain family (Polkadot / EVM / Solana / Bitcoin)

- `@talismn/bitcoin`: new package — Esplora REST client (failover, fee normalization), HD gap-limit scanner (dual tree, block-aware), PSBT build/sign/finalize/verify (`@scure/btc-signer`, coin selection, taproot), and `isBitcoinAddressValidForNetwork` (network-aware address validation)
- `@talismn/crypto`: Bitcoin derivation (BIP84 P2WPKH + BIP86 P2TR), xpub detect/normalize, P2WPKH/P2TR address encoders, WIF parse/encode; `bip32-xpub` address encoding; `bitcoin-ecdsa` curve now maps to bech32 and the dead `bitcoin-ed25519` curve is removed
- `@talismn/keyring`: `hd-bitcoin` / `ledger-bitcoin` / `watch-only-bitcoin` account types (dual-tree xpub keys + master fingerprint), `addAccountBitcoin`, and `withBitcoinAccountKeys` (derive → use → zeroize)
- `@talismn/chaindata-provider`: `BtcNetwork` / `BtcNativeToken` schemas, network/token union members, and bitcoin platform guards; `getBlockExplorerUrls` returns no url for xpub address/account queries (explorers can't resolve wallet identities)
- `@talismn/chain-connectors`: `IChainConnectorBtc` + `ChainConnectorBtc`
- `@talismn/balances`: `btc-native` balance module (block-aware poll, dual-tree aggregate row); `PlatformConnector` gains bitcoin, non-polkadot fetch/subscribe args accept optional `BtcAccountsMeta`, and `getBalances$` accepts a `btcAccounts` option
- `@talismn/orb`: bitcoin account-type overlay (₿) on the identicon
