import { AccountsStore } from "@polkadot/extension-base/stores"
import keyring from "@polkadot/ui-keyring"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import { log } from "extension-shared"

let isLoaded = false

/**
 * @deprecated
 * @function awaitKeyringLoaded
 * @description
 * This function is used to wait for the keyring to be loaded. It returns a promise which resolves to true once all accounts have been loaded into the keyring.
 */
export const awaitKeyringLoaded = async () => {
  log.warn("[deprecated] awaitKeyringLoaded", new Error().stack)

  // the keyring does funky stuff when we try and access it before this is ready
  // wait for `@polkadot/util-crypto` to be ready (it needs to load some wasm)
  await cryptoWaitReady()

  if (!isLoaded) {
    keyring.loadAll({
      store: new AccountsStore(),
      type: "sr25519",
      filter: (json) => {
        return typeof json?.address === "string"
      },
    })
    isLoaded = true
  }

  // wait for in memory accounts count to match expected accounts count
  await new Promise((resolve) => {
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
