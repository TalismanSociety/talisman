import { ChangePasswordRequest } from "@core/domains/app/types"
import { log } from "@core/log"
import { KeyringPair } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"
import { KeyringJson } from "@polkadot/ui-keyring/types"
import * as Sentry from "@sentry/browser"
import { Err, Ok, Result } from "ts-results"
import Browser from "webextension-polyfill"

import seedPhraseStore, { SeedPhraseStore, encryptSeed } from "../accounts/store"
import { verifierCertificateMnemonicStore } from "../accounts/store.verifierCertificateMnemonic"

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
    log.error(error)
    return Err("Error re-encrypting keypairs")
  }
  return Ok(successfulPairs)
}

const migrateAnyMnemonic =
  (store: SeedPhraseStore) =>
  async (
    currentPw: string,
    newPw: string
  ): Promise<Result<true | undefined, "Unable to decrypt seed" | "Error encrypting mnemonic">> => {
    const seedResult = await store.getSeed(currentPw)
    if (seedResult.err) return Err("Unable to decrypt seed")
    const seed = seedResult.val
    if (!seed) return Ok(undefined)
    try {
      // eslint-disable-next-line no-var
      var cipher = await encryptSeed(seed, newPw)
    } catch (error) {
      Sentry.captureException(error)
      return Err("Error encrypting mnemonic")
    }
    // the new cipher is only set if it is successfully re-encrypted
    await store.set({ cipher })
    return Ok(true)
  }

const migrateTalismanMnemonic = migrateAnyMnemonic(seedPhraseStore)
const migrateVerifierCertificateMnemonic = migrateAnyMnemonic(verifierCertificateMnemonicStore)

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
    Browser.storage.local.set({ [TALISMAN_BACKUP_KEYRING_KEY]: JSON.stringify(backupJson) })

    // attempt to migrate keypairs first
    const keypairMigrationResult = await migratePairs(currentPw, newPw)
    if (keypairMigrationResult.err) {
      throw Error(keypairMigrationResult.val)
    }
    if (keypairMigrationResult.val.length !== backupJson.accounts.filter(eligiblePairFilter).length)
      throw new Error("Unable to re-encrypt all keypairs when changing password")
    // now migrate seed phrase store password
    const mnemonicMigrationResult = await migrateTalismanMnemonic(currentPw, newPw)
    if (mnemonicMigrationResult.err) {
      throw Error(mnemonicMigrationResult.val)
    }
    // now migrate polkadot vault verifier cert phrase store password
    const vaultMigrationResult = await migrateVerifierCertificateMnemonic(currentPw, newPw)
    if (vaultMigrationResult.err) {
      throw Error(vaultMigrationResult.val)
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
