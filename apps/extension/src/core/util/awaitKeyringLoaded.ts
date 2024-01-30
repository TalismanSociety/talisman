import keyring from "@polkadot/ui-keyring"
import Browser from "webextension-polyfill"

/**
 * @function awaitKeyringLoaded
 * @description
 * This function is used to wait for the keyring to be loaded. It returns a promise which resolves to true once all accounts have been loaded into the keyring.
 */
export const awaitKeyringLoaded = () =>
  new Promise((resolve) => {
    const keyringSubscription = keyring.accounts.subject.subscribe(async (addresses) => {
      const storageKeys = Object.keys(await Browser.storage.local.get(null))

      const loadedAccountsCount = Object.keys(addresses).length
      const totalAccountsCount = storageKeys.filter((key) => key.startsWith("account:0x")).length

      if (loadedAccountsCount < totalAccountsCount) return

      keyringSubscription.unsubscribe()
      resolve(true)
    })
  })
