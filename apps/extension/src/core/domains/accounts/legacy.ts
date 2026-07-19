import { assert } from "@talismn/util"

import { getSecretKeyFromPjsJson } from "../keyring/getSecretKeyFromPjsJson"
import { getLegacyPjsAccounts } from "../keyring/legacyPjsAccounts"

const LEGACY_ROOT = "ROOT"

// Deprecated login method since v1.19
export const authenticateLegacyMethod = async (password: string) => {
  // attempt to log in via the legacy method
  const accounts = await getLegacyPjsAccounts()
  const primaryAccount = accounts.find(({ meta }) => meta.origin === LEGACY_ROOT)
  assert(primaryAccount, "No primary account, unable to authorise")

  // a successful decrypt of the keystore means authenticated
  getSecretKeyFromPjsJson(primaryAccount, password)
}
