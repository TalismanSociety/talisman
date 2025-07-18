import legacyKeyring from "@polkadot/ui-keyring"
import { isValidDerivationPath } from "@talismn/crypto"
import { AddAccountExternalOptions } from "@talismn/keyring"
import { HexString } from "@talismn/util"
import { log } from "extension-shared"
import { capitalize } from "lodash-es"

import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { awaitKeyringLoaded } from "../../../util/awaitKeyringLoaded"
import { LegacyAccountOrigin, SubstrateLedgerAppType } from "../../accounts/types"
import { addressBookStore } from "../../app/store.addressBook"
import { appStore } from "../../app/store.app"
import { mnemonicsStore } from "../../mnemonics/store"
import { getSecretKeyFromPjsJson } from "../getSecretKeyFromPjsJson"
import { pjsKeypairTypeToCurve } from "../migration-utils"
import { keyringStore } from "../store"

const MIGRATION_LABEL = "Updating keyring"

export const migrateFromPjsKeyring: Migration = {
  forward: new MigrationFunction(({ password }) => executeMigrationFromPjsKeyring(password)),
  // no way back
}

/**
 * @param password
 * @param replay use only for debugging, it will clear the keyring before running the migration
 */
const executeMigrationFromPjsKeyring = async (password: string, reset = false) => {
  const errors = [] as string[]
  const stopMainTimer = log.timer("executeMigrationFromPjsKeyring")
  try {
    await appStore.set({ currentMigration: { name: MIGRATION_LABEL, progress: 0 } })

    await awaitKeyringLoaded()

    if (reset) await keyringStore.reset()

    // fetch legacy data to migrate
    const oldMnemonics = Object.values(await mnemonicsStore.get())
    const oldPairs = legacyKeyring.getPairs()
    const oldContacts = Object.values(await addressBookStore.get())
    const oldCertMnemonicId = await appStore.get("vaultVerifierCertificateMnemonicId")

    // manage progress in local storage to let the frontend know about migration's progress
    let currentStep = 0
    const totalSteps = oldMnemonics.length + oldPairs.length + oldContacts.length + 1

    const updateMigrationProgress = () => {
      currentStep++
      const progress = currentStep / totalSteps
      return appStore.set({
        currentMigration: { name: MIGRATION_LABEL, progress },
      })
    }

    // map old to new mnemonic ids so we know how to replug each account derived from them
    const oldToNewMnemonicId = new Map<string, string>()

    /**
     * Migrate Mnemonics
     */
    for (const oldMnemonic of oldMnemonics) {
      try {
        const { id: oldMnemonicId, name, confirmed } = oldMnemonic
        const resMnemonicText = await mnemonicsStore.getMnemonic(oldMnemonicId, password)

        if (resMnemonicText.ok && resMnemonicText.val) {
          const existing = await keyringStore.getExistingMnemonicId(resMnemonicText.val)
          if (existing) {
            // skip if already migrated in a previous attempt
            oldToNewMnemonicId.set(oldMnemonicId, existing)
            continue
          }

          const newMnemonic = await keyringStore.addMnemonic({
            mnemonic: resMnemonicText.val,
            name,
            confirmed,
          })
          oldToNewMnemonicId.set(oldMnemonicId, newMnemonic.id)
        }
      } catch (err) {
        errors.push(`Failed to migrate mnemonic ${oldMnemonic.name}`)
        log.error("Failed to migrate mnemonic", { err, mnemonicId: oldMnemonic.id })
      } finally {
        await updateMigrationProgress()
      }
    }

    /**
     * Migrate Accounts
     */

    for (const oldPair of oldPairs) {
      const origin = oldPair.meta.origin as string

      try {
        // skip if already migrated in a previous attempt
        if (await keyringStore.getAccount(oldPair.address)) continue

        switch (origin) {
          case "ROOT":
          case "SEED":
          case "SEED_STORED":
          case "DERIVED":
          case "JSON":
          case LegacyAccountOrigin.Talisman: {
            const curve = pjsKeypairTypeToCurve(oldPair.type)
            const name = oldPair.meta.name ?? `Keypair ${oldPair.address}`
            const mnemonicId =
              typeof oldPair.meta.derivedMnemonicId === "string"
                ? oldToNewMnemonicId.get(oldPair.meta.derivedMnemonicId)
                : null
            let derivationPath = oldPair.meta.derivationPath as string | undefined

            // for ethereum accounts, remove leading slash in derivation path
            if (curve === "ethereum" && derivationPath?.startsWith("/m/"))
              derivationPath = derivationPath.substring(1)

            if (
              mnemonicId &&
              typeof derivationPath === "string" && // allow empty string (substrate default)
              (await isValidDerivationPath(derivationPath, oldPair.type))
            ) {
              // keep the "link" to associated mnemonic by rederiving the account from it
              await keyringStore.addAccountDerive({
                type: "existing-mnemonic",
                name,
                curve,
                mnemonicId,
                derivationPath,
              })
            } else {
              // import as standalone keypair
              await keyringStore.addAccountKeypair({
                name,
                curve,
                secretKey: getSecretKeyFromPjsJson(oldPair.toJson(password), password),
              })
            }

            break
          }

          case LegacyAccountOrigin.Qr: {
            await keyringStore.addAccountExternal({
              type: "polkadot-vault",
              address: oldPair.address,
              genesisHash: oldPair.meta.genesisHash ?? null,
              name: oldPair.meta.name ?? `Polkadot Vault ${oldPair.address}`,
            })
            break
          }

          case "HARDWARE":
          case LegacyAccountOrigin.Ledger: {
            if (oldPair.type === "ethereum") {
              await keyringStore.addAccountExternal({
                type: "ledger-ethereum",
                address: oldPair.address,
                name: oldPair.meta.name ?? `Ledger ${oldPair.address}`,
                derivationPath: oldPair.meta.path as string,
              })
            } else {
              const { accountIndex, addressOffset, ledgerApp, migrationAppName } = oldPair.meta as {
                accountIndex: number
                addressOffset: number
                ledgerApp?: SubstrateLedgerAppType
                migrationAppName?: string
              }

              const options: AddAccountExternalOptions = {
                type: "ledger-polkadot",
                curve: "ed25519",
                name: oldPair.meta.name ?? `Ledger ${oldPair.address}`,
                address: oldPair.address,
                app: migrationAppName ?? "Polkadot",
                accountIndex,
                addressOffset,
              }

              if (ledgerApp === SubstrateLedgerAppType.Legacy)
                options.genesisHash = oldPair.meta.genesisHash as HexString

              await keyringStore.addAccountExternal(options)
            }
            break
          }

          case LegacyAccountOrigin.Signet: {
            await keyringStore.addAccountExternal({
              type: "signet",
              address: oldPair.address,
              name: oldPair.meta.name ?? `Signet ${oldPair.address}`,
              url: oldPair.meta.signetUrl as string,
              genesisHash: oldPair.meta.genesisHash as HexString,
            })

            break
          }

          case LegacyAccountOrigin.Watched:
          case LegacyAccountOrigin.Dcent: {
            await keyringStore.addAccountExternal({
              type: "watch-only",
              address: oldPair.address,
              name: oldPair.meta.name ?? `${capitalize(origin)} ${oldPair.address}`,
              isPortfolio: !!oldPair.meta.isPortfolio || origin === LegacyAccountOrigin.Dcent,
            })
            break
          }

          default: {
            log.error("Unknown account origin", { origin, pair: oldPair })
            throw new Error("Unknown origin " + origin)
          }
        }
      } catch (err) {
        errors.push(`Failed to migrate account ${oldPair.meta.name ?? oldPair.address}`)
        log.error("Failed to migrate account", { err, address: oldPair.address })
      } finally {
        await updateMigrationProgress()
      }
    }

    /**
     * Migrate contacts
     */
    for (const oldContact of oldContacts) {
      try {
        // skip if already migrated in a previous attempt
        if (await keyringStore.getAccount(oldContact.address)) continue

        const options: AddAccountExternalOptions = {
          type: "contact",
          name: oldContact.name,
          address: oldContact.address,
        }
        if (oldContact.genesisHash) options.genesisHash = oldContact.genesisHash

        await keyringStore.addAccountExternal(options)
      } catch (err) {
        // ignore
      } finally {
        await updateMigrationProgress()
      }
    }

    /**
     * Migrate PV certificate mnemonic id
     */
    if (oldCertMnemonicId) {
      const newCertMnemonicId = oldToNewMnemonicId.get(oldCertMnemonicId)
      if (newCertMnemonicId)
        await appStore.set({ vaultVerifierCertificateMnemonicId: newCertMnemonicId })
    }
    await updateMigrationProgress() // 100%

    if (errors.length) {
      appStore.set({
        currentMigration: { name: MIGRATION_LABEL, errors },
      })
      // throw to prevent cleanup to occur, and inform the runner that it failed.
      // it will be retried on next startup
      throw new Error("Migration failed")
    }

    // copy the password store's data, so we have a snapshot of it that matches the old keyring
    // this entry is to be deleted in a future version
    const { password: passwordPjsBackup } = await chrome.storage.local.get("password")
    await chrome.storage.local.set({ passwordPjsBackup })

    /**
     * Delete old data
     * @dev: we will do this step in a future version, allowing us to rollback if necessary
     */
    // try {
    //   // cleanup
    //   const keys = Object.keys(await chrome.storage.local.get(null)).filter((key) =>
    //     key.startsWith("account:0x"),
    //   )
    //   await Promise.all(keys.map(async (key) => await chrome.storage.local.remove(key)))

    //   await mnemonicsStore.clear()
    //   await addressBookStore.clear()
    // } catch (err) {
    //   log.error("Migration cleanup failed", { err })
    //   // ignore
    // }

    await appStore.delete("currentMigration")
  } finally {
    stopMainTimer()
  }
}

// if (DEBUG) {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const hostObj = globalThis as any

//   // utility to run the migration manually fron dev console
//   hostObj.executeMigrationFromPjsKeyring = async () => {
//     const password = await passwordStore.getPassword()
//     if (!password) throw new Error("Password not found")
//     await executeMigrationFromPjsKeyring(password, true)
//   }
// }
