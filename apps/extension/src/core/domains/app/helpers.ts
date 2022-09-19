import { DEBUG } from "@core/constants"
import { ChangePasswordRequest } from "@core/domains/app/types"
import { KeyringPair } from "@polkadot/keyring/types"
import keyring, { Keyring } from "@polkadot/ui-keyring"
import * as Sentry from "@sentry/browser"
import { Err, Ok, Result } from "ts-results"
import Browser from "webextension-polyfill"

import seedPhraseStore, { encryptSeed } from "../accounts/store"

export const TALISMAN_BACKUP_KEYRING_KEY = "talismanKeyringBackup"

export const restoreBackupKeyring = async (
  password: string
): Promise<Result<Keyring, "No keyring backup found">> => {
  const backupJson = (await Browser.storage.local.get(TALISMAN_BACKUP_KEYRING_KEY))[
    TALISMAN_BACKUP_KEYRING_KEY
  ]
  if (!backupJson) return Err("No keyring backup found")

  return Ok(new Keyring())
}

const migratePairs = async (
  currentPw: string,
  newPw: string
): Promise<Result<KeyringPair[], "Error re-encrypting keypairs">> => {
  const pairs = keyring.getPairs()
  const backupJson = await keyring.backupAccounts(
    pairs.map(({ address }) => address),
    currentPw
  )

  // store the keyring object as
  await Browser.storage.local.set({ [TALISMAN_BACKUP_KEYRING_KEY]: JSON.stringify(backupJson) })

  // keep track of which pairs have been successfully migrated
  const successfulPairs: KeyringPair[] = []
  try {
    // this should be done in a tx, if any of them fail then they should be rolled back
    pairs.forEach((pair) => {
      pair.decodePkcs8(currentPw)
      keyring.encryptAccount(pair, newPw)
      successfulPairs.push(pair)
    })
    if (successfulPairs.length !== backupJson.accounts.length)
      throw new Error("Unable to re-encrypt all keypairs when changing password")
  } catch (error) {
    await Browser.storage.local.remove(TALISMAN_BACKUP_KEYRING_KEY)
    keyring.restoreAccounts(backupJson, currentPw)
    Sentry.captureException(error)
    return Err("Error re-encrypting keypairs")
  }
  await Browser.storage.local.remove(TALISMAN_BACKUP_KEYRING_KEY)
  return Ok(successfulPairs)
}

const migrateMnemonic = async (
  currentPw: string,
  newPw: string
): Promise<Result<true, "Unable to decrypt seed" | "Error encrypting mnemonic">> => {
  const seedResult = await seedPhraseStore.getSeed(currentPw)
  if (seedResult.err) return Err("Unable to decrypt seed")
  const seed = seedResult.val
  try {
    // eslint-disable-next-line no-var
    var cipher = await encryptSeed(seed, newPw)
  } catch (error) {
    Sentry.captureException(error)
    return Err("Error encrypting mnemonic")
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
    const keypairMigrationResult = await migratePairs(currentPw, newPw)
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
