import { DEBUG } from "@core/constants"
import { KeyringPair } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"

import passwordStore from "./store.password"

export const migratePasswordV1ToV2 = async (plaintextPw: string) => {
  const pairs = keyring.getPairs()

  await passwordStore.createPassword(plaintextPw) // also creates salt and stores it in the store
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
      pair.decodePkcs8(hashedPw)
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

export const migratePasswordV2ToV1 = async (plaintextPw: string) => {
  const pairs = keyring.getPairs()

  await passwordStore.getHashedPassword(plaintextPw)
  const hashedPw = passwordStore.getPassword() as string

  // keep track of which pairs have been successfully migrated
  const successfulPairs: KeyringPair[] = []
  try {
    // this should be done in a tx, if any of them fail then they should be rolled back
    pairs.forEach((pair) => {
      pair.decodePkcs8(hashedPw)
      keyring.encryptAccount(pair, plaintextPw)
      successfulPairs.push(pair)
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    DEBUG && console.error("Error migrating keypair passwords: ", error)
    successfulPairs?.forEach((pair) => {
      pair.decodePkcs8(plaintextPw)
      keyring.encryptAccount(pair, hashedPw)
    })
    // salt has been set in PasswordStore.createPassword, need to unset it now
    return false
  }
  // success
  passwordStore.set({ salt: undefined, passwordVersion: 1 })
  return true
}
