import { DEBUG } from "@core/constants"
import passwordStore from "@core/domains/app/store.password"
import { KeyringPair } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"

import seedPhraseStore, { encryptSeed } from "../accounts/store"

export const migratePasswordV1ToV2 = async (plaintextPw: string) => {
  const pairs = keyring.getPairs()

  const { salt, password: hashedPw } = await passwordStore.createPassword(plaintextPw)

  // keep track of which pairs have been successfully migrated
  const successfulPairs: KeyringPair[] = []
  let seedPhraseMigrated = false
  try {
    // this should be done in a tx, if any of them fail then they should be rolled back
    pairs.forEach((pair) => {
      pair.decodePkcs8(plaintextPw)
      keyring.encryptAccount(pair, hashedPw)

      successfulPairs.push(pair)
    })

    // now migrate seed phrase store password
    const { ok, val: seed } = await seedPhraseStore.getSeed(plaintextPw)
    if (ok) {
      const cipher = await encryptSeed(seed, hashedPw)
      await seedPhraseStore.set({ cipher })
      seedPhraseMigrated = true
    } else throw new Error(seed)
  } catch (error) {
    // eslint-disable-next-line no-console
    DEBUG && console.error("Error migrating password: ", error)
    successfulPairs?.forEach((pair) => {
      pair.decodePkcs8(hashedPw)
      keyring.encryptAccount(pair, plaintextPw)
    })

    if (seedPhraseMigrated) {
      // revert seedphrase conversion
      const { ok, val: seed } = await seedPhraseStore.getSeed(hashedPw)
      if (ok) {
        const cipher = await encryptSeed(seed, plaintextPw)
        await seedPhraseStore.set({ cipher })
      }
    }

    return false
  }
  // success
  await passwordStore.set({ isHashed: true, salt })
  passwordStore.setPassword(hashedPw)
  return true
}

export const migratePasswordV2ToV1 = async (plaintextPw: string) => {
  const pairs = keyring.getPairs()

  const hashedPw = await passwordStore.getHashedPassword(plaintextPw)

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
    return false
  }
  // success
  passwordStore.set({ salt: undefined, isTrimmed: false, isHashed: false })
  return true
}
