# Talisman Wallet

A non-custodial browser wallet for Polkadot SDK, Ethereum (EVM) and Solana networks. This glossary sets one word per concept. Older code still uses some of the words under _Avoid_.

## Wallet processes

**Backend**:
The extension's background service worker (`apps/extension/entrypoints/background.ts`, code in `apps/extension/src/core/`). It holds the keys, the stores and the shared chain connections, and it handles every request from the frontend and from dapps. It is not a server. Talisman's hosted services (Gandalf, the coins API, chaindata) are separate and are named as such.
_Avoid_: server, service worker (except when the browser lifecycle matters)

**Frontend**:
The React UI in the popup, dashboard, onboarding and support pages (code in `apps/extension/src/ui/`). It talks to the backend over `PortMessageService` messages.
_Avoid_: client, UI process

## Networks and tokens

**Platform**:
The chain family that a network, token or account belongs to: `polkadot`, `ethereum` or `solana`.
_Avoid_: ecosystem, chain type

**Network**:
One blockchain that the wallet can connect to. Code prefixes by platform: `DotNetwork`, `EthNetwork`, `SolNetwork`.
_Avoid_: chain (except for the EVM numeric `chainId` and the Polkadot SDK genesis hash)

**Polkadot SDK chain**:
A network of the `polkadot` platform. Code uses `Dot` for network types and `Substrate`/`Sub` for token types and balance modules; these are the same platform.
_Avoid_: parachain (unless the relay-chain relationship matters)

**Chaindata**:
The list of known networks and tokens, published in the TalismanSociety/chaindata repository and bundled as a fallback.

**Custom network** / **Custom token**:
A network or token that the user added, or a known one whose settings the user changed.

**Active network** / **Active token**:
A network or token that the user has turned on. The wallet fetches balances only for active ones.
_Avoid_: enabled

**Token**:
A fungible asset on one network, with a token id, symbol and decimals. Each balance module defines its own token type (e.g. `evm-erc20`, `substrate-assets`).
_Avoid_: asset, coin, currency

**Mirror token**:
A token that shows the same balance as another token on the same network (`mirrorOf`). The UI hides it where the two would appear as duplicates.

**Planck**:
The integer base unit of any token amount, on every platform. Convert with `planckToTokens` / `tokensToPlanck`.
_Avoid_: raw, wei, lamports, rao, plancks, planks (use these only at an API boundary that names them)

**Mini-metadata**:
The part of a Polkadot SDK chain's runtime metadata that the balance modules need, trimmed to save memory.

**Token rate**:
The price of one token in a rate currency.

**Rate currency**:
A currency that the user can show values in. Includes fiat currencies and some crypto (BTC, ETH, DOT, TAO).
_Avoid_: fiat (when the currency can be a crypto)

## Accounts

**Account**:
An entry in the keyring: an address with a type, a name and type-specific data.

**Account type**:
How the wallet controls an account: `keypair`, `ledger-polkadot`, `ledger-ethereum`, `ledger-solana`, `polkadot-vault`, `signet`, `watch-only` or `contact`.

**Owned account**:
An account that the user can sign with: `keypair`, a Ledger type, or `polkadot-vault`.

**Portfolio account**:
An account whose balances count in the portfolio totals: an owned account, or a watch-only account that the user marked as portfolio.

**Contact**:
An address that the user saved to send funds to. It is an account of type `contact`.
_Avoid_: address book entry

**Watch-only account**:
An address that the user follows but cannot sign for.

**Signet account**:
An account controlled by Signet, Talisman's multisig vault app. The wallet sends its transactions to Signet for approval.

**Polkadot Vault account**:
An account whose key is on an offline device. The wallet signs with it through QR codes.
_Avoid_: Parity Signer

**Mnemonic**:
The word list that derives the keys of one or more accounts. The UI calls it the "recovery phrase".
_Avoid_: seed phrase, secret phrase

**Address**:
The string that identifies an account on a platform. One account has one address.

## Dapps and requests

**Dapp**:
A website that connects to the wallet through the injected providers.
_Avoid_: tab, site (except in "site authorisation")

**Site authorisation**:
The user's permission for a dapp to see some accounts.
_Avoid_: connection, authorization

**Request**:
An action that waits for the user's approval in a popup: a sign request, a site authorisation, an add-network request, and so on.

**Sign request**:
A request to sign a transaction or a message with an account.

**Remote config**:
Settings that the wallet downloads at runtime, including feature flags that can turn features off.

**Protector**:
The phishing protection that blocks known malicious dapps.

**Gandalf**:
Talisman's access-token service. The wallet gets a token from it and sends that token to Talisman's APIs.

## Features

**Portfolio**:
The view of the user's balances, grouped by token symbol across networks.

**Send funds**:
The feature that transfers tokens to an address. "Transfer" is the on-chain call that it makes.

**Swap**:
An exchange of one token for another, often across networks, through a swap provider (e.g. LI.FI, StealthEX, SimpleSwap).
_Avoid_: exchange, trade

**Earn**:
The umbrella feature for putting tokens to work: native staking and yield.

**Earn system**:
A source of earn products: Yield.xyz or Seek.
_Avoid_: provider (a Yield.xyz provider is a protocol inside the Yield.xyz system)

**Staking**:
Locking native tokens to secure a network (nomination pools, bonding, Bittensor stake).

**Asset discovery**:
The background scan that finds inactive tokens with a balance in the user's accounts, and makes them active.

**Toast** / **Notification** / **Banner**:
A toast is a short message inside the wallet UI. A notification is an operating-system notification from the background. A banner is a message at the top of a dashboard page.

## Bittensor

**Subnet**:
One of Bittensor's specialised networks, identified by a netuid. Subnet 0 is the root subnet.

**Alpha**:
The token of one subnet. Staking TAO into a subnet gives alpha (dynamic TAO, "dTAO"). Buying or selling alpha is staking or unstaking, even where the UI calls it a swap.

**Hotkey**:
The address of a validator that stake is delegated to.

**Coldkey**:
The user's account that owns the stake.
