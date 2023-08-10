import keyring from "@polkadot/ui-keyring"
import Browser from "webextension-polyfill"

/**
 * @function awaitKeyringLoaded
 * @description
 * This function is used to wait for the keyring to be loaded. It returns a promise which resolves to true once all accounts have been loaded into the keyring.
 */
export const awaitKeyringLoaded = async () => {
  const localData = await Browser.storage.local.get(null)
  const addressCount = Object.entries(localData).filter(([key]) =>
    key.startsWith("account:0x")
  ).length

  return new Promise((resolve) => {
    keyring.accounts.subject.subscribe(async (addresses) => {
      if (Object.keys(addresses).length === addressCount) resolve(true)
    })
  })
}
