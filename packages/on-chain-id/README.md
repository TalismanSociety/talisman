# @talismn/on-chain-id

<img src="talisman.svg" alt="Talisman" width="15%" align="right" />

[![license](https://img.shields.io/github/license/talismansociety/talisman?style=flat-square)](https://github.com/TalismanSociety/talisman/blob/dev/LICENSE)
[![npm-version](https://img.shields.io/npm/v/@talismn/on-chain-id?style=flat-square)](https://www.npmjs.com/package/@talismn/on-chain-id)
[![npm-downloads](https://img.shields.io/npm/dw/@talismn/on-chain-id?style=flat-square)](https://www.npmjs.com/package/@talismn/on-chain-id)

**@talismn/on-chain-id** is used to query on-chain identifiers for account addresses in Ethereum, and more upcoming providers.

In the case of Ethereum, it is also possible to go the other way (i.e. use the ENS identifier to look up an account address).

The ENS domain resolution is handled internally by `viem`, the purpose of `@talismn/on-chain-id` is just to colocate the Ethereum and upcoming providers lookups into one API.
