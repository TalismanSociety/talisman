import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"

const LEGACY_ROOT = "ROOT"

export const getLegacyAuthenticationAccount = () => {
  const allAccounts = keyring.getAccounts()

  if (allAccounts.length === 0) return
  const storedSeedAccount = allAccounts.find(({ meta }) => meta.origin === LEGACY_ROOT)

  if (storedSeedAccount) return storedSeedAccount
  return
}

export const authenticateLegacyMethod = (password: string) => {
  // attempt to log in via the legacy method
  const primaryAccount = getLegacyAuthenticationAccount()
  assert(primaryAccount, "No primary account, unable to authorise")

  // fetch keyring pair from address
  const pair = keyring.getPair(primaryAccount.address)

  // attempt unlock the pair
  // a successful unlock means authenticated
  pair.unlock(password)
  pair.lock()
}
