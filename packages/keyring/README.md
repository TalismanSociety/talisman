# @talismn/keyring

<img src="talisman.svg" alt="Talisman" width="15%" align="right" />

[![license](https://img.shields.io/github/license/talismansociety/talisman?style=flat-square)](https://github.com/TalismanSociety/talisman/blob/dev/LICENSE)
[![npm-version](https://img.shields.io/npm/v/@talismn/keyring?style=flat-square)](https://www.npmjs.com/package/@talismn/keyring)
[![npm-downloads](https://img.shields.io/npm/dw/@talismn/keyring?style=flat-square)](https://www.npmjs.com/package/@talismn/keyring)

**@talismn/keyring** is a basic keyring implementation used by the Talisman wallet.

This keyring is not ecosystem specific. As such, it does not provide any signing functionality, and is only used to store accounts and mnemonics.

![](./docs/keyring-diagram.png)

> ⚠️ This package relies on the browser's native crypto API for encryption and decryption. It is designed for use in modern browsers—Talisman wallet runs on Chromium v102+ and Firefox v109+ at the time of writing.
> Using this library in environments with weaker crypto API implementations, particularly for random number generation, may introduce security risks.
