import keyring from "@polkadot/ui-keyring"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import { watCryptoWaitReady } from "@talismn/scale"

/**
 * @function awaitKeyringLoaded
 * @description
 * This function is used to wait for the keyring to be loaded. It returns a promise which resolves to true once all accounts have been loaded into the keyring.
 */
export const awaitKeyringLoaded = async () => {
  // the keyring does funky stuff when we try and access it before these are ready
  await Promise.all([
    // wait for `@polkadot/util-crypto` to be ready (it needs to load some wasm)
    cryptoWaitReady(),
    // wait for `@talismn/scale` to be ready (it needs to load some wasm)
    watCryptoWaitReady(),
  ])

  return new Promise((resolve) => {
    const keyringSubscription = keyring.accounts.subject.subscribe(async (addresses) => {
      const storageKeys = Object.keys(await chrome.storage.local.get(null))

      const loadedAccountsCount = Object.keys(addresses).length
      const totalAccountsCount = storageKeys.filter((key) => key.startsWith("account:0x")).length

      if (loadedAccountsCount < totalAccountsCount) return

      keyringSubscription.unsubscribe()
      resolve(true)
    })
  })
}
