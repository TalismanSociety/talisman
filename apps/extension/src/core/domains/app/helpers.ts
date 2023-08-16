import { ChangePasswordRequest } from "@core/domains/app/types"
import { log } from "@core/log"
import { KeyringPair } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"
import { KeyringJson } from "@polkadot/ui-keyring/types"
import * as Sentry from "@sentry/browser"
import { Err, Ok, Result } from "ts-results"
import Browser from "webextension-polyfill"

import {
  MnemonicErrors,
  SeedPhraseStoreData,
  decryptMnemonic,
  encryptMnemonic,
  seedPhraseStore,
} from "../mnemonics/store"

export const TALISMAN_BACKUP_KEYRING_KEY = "talismanKeyringBackup"

const eligiblePairFilter = (pair: KeyringPair | KeyringJson) =>
  !pair.meta.isHardware && !pair.meta.isExternal

export const restoreBackupKeyring = async (
  password: string
): Promise<Result<boolean, "No keyring backup found" | "Unable to restore backup keyring">> => {
  const backupJsonObj = await Browser.storage.local.get(TALISMAN_BACKUP_KEYRING_KEY)

  if (!backupJsonObj || !backupJsonObj[TALISMAN_BACKUP_KEYRING_KEY])
    return Err("No keyring backup found")

  const backupJson = backupJsonObj[TALISMAN_BACKUP_KEYRING_KEY]
  try {
    keyring.restoreAccounts(JSON.parse(backupJson), password)
  } catch (error) {
    return Err("Unable to restore backup keyring")
  }
  await Browser.storage.local.remove(TALISMAN_BACKUP_KEYRING_KEY)
  return Ok(true)
}

const migratePairs = async (
  currentPw: string,
  newPw: string
): Promise<Result<KeyringPair[], "Error re-encrypting keypairs">> => {
  const pairs = keyring.getPairs().filter(eligiblePairFilter)
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
    Sentry.captureException(error)
    log.error("Error migrating pairs: ", error)
    return Err("Error re-encrypting keypairs")
  }
  return Ok(successfulPairs)
}

const migrateMnemonic = async (
  encryptedCipher: string,
  currentPw: string,
  newPw: string
): Promise<
  Result<
    string | undefined,
    | MnemonicErrors.IncorrectPassword
    | MnemonicErrors.UnableToDecrypt
    | MnemonicErrors.UnableToEncrypt
  >
> => {
  const decryptResult = await decryptMnemonic(encryptedCipher, currentPw)
  if (decryptResult.err) return Err(decryptResult.val)
  const seed = decryptResult.val
  if (!seed) return Ok(undefined)
  // attempt to re-encrypt the seed phrase with the new password
  try {
    return Ok(await encryptMnemonic(seed, newPw))
  } catch (error) {
    Sentry.captureException(error)
    return Err(MnemonicErrors.UnableToEncrypt)
  }
}

export const changePassword = async ({
  currentPw,
  newPw,
}: Pick<ChangePasswordRequest, "currentPw" | "newPw">): Promise<
  Result<boolean, "Error changing password">
> => {
  try {
    const backupJson = await keyring.backupAccounts(
      keyring.getPairs().map(({ address }) => address),
      currentPw
    )
    await Browser.storage.local.set({ [TALISMAN_BACKUP_KEYRING_KEY]: JSON.stringify(backupJson) })

    // attempt to migrate keypairs first
    const keypairMigrationResult = await migratePairs(currentPw, newPw)
    if (keypairMigrationResult.err) {
      throw Error(keypairMigrationResult.val)
    }
    if (keypairMigrationResult.val.length !== backupJson.accounts.filter(eligiblePairFilter).length)
      throw new Error("Unable to re-encrypt all keypairs when changing password")
    // now migrate seed phrase store passwords
    const seedStoreData = await seedPhraseStore.get()
    const newSeedStoreData: Partial<SeedPhraseStoreData> = {}
    if (seedStoreData) {
      Object.entries(seedStoreData).forEach(async ([key, value]) => {
        if (!value.cipher) {
          // unset this value in the store
          newSeedStoreData[key] = undefined
          return
        }

        const newCipher = await migrateMnemonic(value.cipher, currentPw, newPw)
        if (newCipher.err) throw Error(newCipher.val)
        newSeedStoreData[key] = { ...value, cipher: newCipher.val }
      })
      await seedPhraseStore.set(newSeedStoreData)
    }
  } catch (error) {
    await restoreBackupKeyring(currentPw)
    log.error("Error migrating password: ", error)
    return Err("Error changing password")
  }
  await Browser.storage.local.remove(TALISMAN_BACKUP_KEYRING_KEY)
  // success
  return Ok(true)
}

export const getHostName = (url: string): Result<string, "Unable to get host from url"> => {
  try {
    const host = new URL(url).hostname
    return Ok(host)
  } catch (error) {
    log.error(url, error)
    return Err("Unable to get host from url")
  }
}
