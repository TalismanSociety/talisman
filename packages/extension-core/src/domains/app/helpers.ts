import { KeyringPair } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"
import { KeyringJson } from "@polkadot/ui-keyring/types"
import { log } from "extension-shared"
import { Err, Ok, Result } from "ts-results"

import { sentry } from "../../config/sentry"
import {
  MnemonicErrors,
  MnemonicsStoreData,
  decryptMnemonic,
  encryptMnemonic,
  mnemonicsStore,
} from "../mnemonics/store"
import {
  ChangePasswordRequest,
  ChangePasswordStatusUpdateStatus,
  ChangePasswordStatusUpdateType,
} from "./types"

export const TALISMAN_BACKUP_KEYRING_KEY = "talismanKeyringBackup"

const eligiblePairFilter = (pair: KeyringPair | KeyringJson) =>
  !pair.meta.isHardware && !pair.meta.isExternal

export const restoreBackupKeyring = async (
  password: string
): Promise<Result<boolean, "No keyring backup found" | "Unable to restore backup keyring">> => {
  const backupJsonObj = await chrome.storage.local.get(TALISMAN_BACKUP_KEYRING_KEY)

  if (!backupJsonObj || !backupJsonObj[TALISMAN_BACKUP_KEYRING_KEY])
    return Err("No keyring backup found")

  const backupJson = backupJsonObj[TALISMAN_BACKUP_KEYRING_KEY]
  try {
    keyring.restoreAccounts(JSON.parse(backupJson), password)
  } catch (error) {
    return Err("Unable to restore backup keyring")
  }
  await chrome.storage.local.remove(TALISMAN_BACKUP_KEYRING_KEY)
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
    sentry.captureException(error)
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
  const mnemonic = decryptResult.val
  if (!mnemonic) return Ok(undefined)
  // attempt to re-encrypt the recovery phrase with the new password
  try {
    const result = await encryptMnemonic(mnemonic, newPw)

    return Ok(result)
  } catch (error) {
    sentry.captureException(error)
    return Err(MnemonicErrors.UnableToEncrypt)
  }
}

export const changePassword = async (
  { currentPw, newPw }: Pick<ChangePasswordRequest, "currentPw" | "newPw">,
  progressCb?: (val: ChangePasswordStatusUpdateType) => void
): Promise<Result<boolean, "Error changing password">> => {
  try {
    progressCb && progressCb(ChangePasswordStatusUpdateStatus.KEYPAIRS)
    const backupJson = await keyring.backupAccounts(
      keyring.getPairs().map(({ address }) => address),
      currentPw
    )
    await chrome.storage.local.set({ [TALISMAN_BACKUP_KEYRING_KEY]: JSON.stringify(backupJson) })

    // attempt to migrate keypairs first
    const keypairMigrationResult = await migratePairs(currentPw, newPw)
    if (keypairMigrationResult.err) {
      throw Error(keypairMigrationResult.val)
    }
    if (keypairMigrationResult.val.length !== backupJson.accounts.filter(eligiblePairFilter).length)
      throw new Error("Unable to re-encrypt all keypairs when changing password")

    progressCb && progressCb(ChangePasswordStatusUpdateStatus.MNEMONICS)
    // now migrate recovery phrase store passwords
    const mnemonicStoreData = await mnemonicsStore.get()
    const newMnemonicStoreData: Partial<MnemonicsStoreData> = {}
    if (Object.values(mnemonicStoreData).length > 0) {
      const mnemonicPromises = Object.entries(mnemonicStoreData).map(async ([key, value]) => {
        if (!value.cipher) {
          // unset this value in the store
          newMnemonicStoreData[key] = undefined
          return
        }

        const newCipher = await migrateMnemonic(value.cipher, currentPw, newPw)
        if (newCipher.err) throw Error(newCipher.val)
        newMnemonicStoreData[key] = { ...value, cipher: newCipher.val }
        return
      })

      await Promise.all(mnemonicPromises)
      await mnemonicsStore.set(newMnemonicStoreData)
    }
  } catch (error) {
    await restoreBackupKeyring(currentPw)
    log.error("Error migrating password: ", error)
    return Err("Error changing password")
  }
  await chrome.storage.local.remove(TALISMAN_BACKUP_KEYRING_KEY)
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
