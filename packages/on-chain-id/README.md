# @talismn/on-chain-id

<img src="talisman.svg" alt="Talisman" width="15%" align="right" />

[![license](https://img.shields.io/github/license/talismansociety/talisman?style=flat-square)](https://github.com/TalismanSociety/talisman/blob/dev/LICENSE)
[![npm-version](https://img.shields.io/npm/v/@talismn/on-chain-id?style=flat-square)](https://www.npmjs.com/package/@talismn/on-chain-id)
[![npm-downloads](https://img.shields.io/npm/dw/@talismn/on-chain-id?style=flat-square)](https://www.npmjs.com/package/@talismn/on-chain-id)

**@talismn/on-chain-id** is used to query on-chain identifiers for account addresses in Ethereum and Polkadot.

In the case of Ethereum, it is also possible to go the other way (i.e. use the ENS identifier to look up an account address).

For Polkadot identities, this package leans heavily on `@talismn/balances`, `@talismn/chain-connector` and associated packages in order to:

1. Share open RPC connections with other wallet/dapp features, and
2. Manage chain state queries in a scalable (multi-chain) manner<sup>[1]</sup>.

<sup>[1] - At the moment this package downloads the entire chain metdata for one state query (`Identity::identityOf`).  
We have plans to improve the `@talismn/mutate-metadata` package in order to accomodate for arbitrary state queries in a decentralized manner.  
These improvements will enable `@talismn/on-chain-id` to scale.</sup>

For Ethereum identities (ENS), this package uses the `@talismn/chain-connector-evm` package in order to establish an `ethers.js` provider to the Ethereum mainnet.

The ENS domain resolution is handled internally by `ethers.js`, the purpose of `@talismn/on-chain-id` is just to colocate the Ethereum and Polkadot lookups into one API.
