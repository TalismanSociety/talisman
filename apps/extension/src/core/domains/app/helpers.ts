import { DEBUG } from "@core/constants"
import { ChangePasswordRequest } from "@core/domains/app/types"
import { KeyringPair } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"
import * as Sentry from "@sentry/browser"
import { Err, Ok, Result } from "ts-results"

import seedPhraseStore, { encryptSeed } from "../accounts/store"

const migratePairs = (
  currentPw: string,
  newPw: string
): Result<KeyringPair[], "Error re-encrypting keypairs"> => {
  const pairs = keyring.getPairs()
  // keep track of which pairs have been successfully migrated
  const successfulPairs: KeyringPair[] = []
  try {
    // this should be done in a tx, if any of them fail then they should be rolled back
    pairs.forEach((pair) => {
      pair.decodePkcs8(currentPw)
      keyring.encryptAccount(pair, newPw)
      successfulPairs.push(pair)
    })
  } catch (error) {
    successfulPairs?.forEach((pair) => {
      pair.decodePkcs8(newPw)
      keyring.encryptAccount(pair, currentPw)
    })
    Sentry.captureException(error)
    return Err("Error re-encrypting keypairs")
  }
  return Ok(successfulPairs)
}

const migrateMnemonic = async (
  currentPw: string,
  newPw: string
): Promise<Result<true, "Error re-encrypting mnemonic">> => {
  const seed = await seedPhraseStore.getSeed(currentPw)
  try {
    // eslint-disable-next-line no-var
    var cipher = await encryptSeed(seed, newPw)
  } catch (error) {
    Sentry.captureException(error)
    return Err("Error re-encrypting mnemonic")
  }
  // the new cipher is only set if it is successfully re-encrypted
  await seedPhraseStore.set({ cipher })
  return Ok(true)
}

export const changePassword = async ({
  currentPw,
  newPw,
}: Pick<ChangePasswordRequest, "currentPw" | "newPw">): Promise<
  Result<boolean, "Error changing password">
> => {
  try {
    const keypairMigrationResult = migratePairs(currentPw, newPw)
    if (keypairMigrationResult.ok) {
      // now migrate seed phrase store password
      const mnemonicMigrationResult = await migrateMnemonic(currentPw, newPw)
      if (mnemonicMigrationResult.err) throw Error(mnemonicMigrationResult.val)
    } else {
      throw Error(keypairMigrationResult.val)
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    DEBUG && console.error("Error migrating password: ", error)
    return Err("Error changing password")
  }
  // success
  return Ok(true)
}
