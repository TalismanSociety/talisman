import { DEBUG } from "@core/constants"
import { KeyringPair } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"

import { PasswordStore } from "./store.password"

export const migratePasswordV1ToV2 = async (passwordStore: PasswordStore, plaintextPw: string) => {
  const pairs = keyring.getPairs()

  await passwordStore.createPassword(plaintextPw)
  const hashedPw = passwordStore.getPassword() as string

  // keep track of which pairs have been successfully migrated
  const successfulPairs: KeyringPair[] = []
  try {
    // this should be done in a tx, if any of them fail then they should be rolled back
    pairs.forEach((pair) => {
      pair.decodePkcs8(plaintextPw)
      keyring.encryptAccount(pair, hashedPw)

      successfulPairs.push(pair)
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    DEBUG && console.error("Error migrating keypair passwords: ", error)
    successfulPairs?.forEach((pair) => {
      keyring.encryptAccount(pair, plaintextPw)
    })
    // salt has been set in PasswordStore.createPassword, need to unset it now
    passwordStore.set({ salt: undefined })
    return false
  }
  // success
  passwordStore.set({ passwordVersion: 2 })
  return true
}
