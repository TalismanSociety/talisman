import legacyKeyring from "@polkadot/ui-keyring"
import { isValidDerivationPath } from "@talismn/crypto"
import { AddAccountExternalOptions } from "@talismn/keyring"
import { HexString, log } from "extension-shared"
import { capitalize } from "lodash"

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

export const executeMigrationFromPjsKeyring = async (password: string) => {
  const stopMainTimer = log.timer("executeMigrationFromPjsKeyring")
  try {
    await appStore.set({ currentMigration: { name: MIGRATION_LABEL, progress: 0 } })

    await awaitKeyringLoaded()

    // ensure any left over from a previous migration attempt is removed
    await keyringStore.reset()

    // fetch old data to migrate
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

        // TODO: decide wether to throw or skip ?
        if (resMnemonicText.ok && resMnemonicText.val) {
          const newMnemonic = await keyringStore.addMnemonic({
            mnemonic: resMnemonicText.val,
            name,
            confirmed,
          })
          oldToNewMnemonicId.set(oldMnemonicId, newMnemonic.id)
        }
      } catch (err) {
        log.error("ERROR Migrate Mnemonics", { err, oldMnemonic })
      } finally {
        await updateMigrationProgress()
      }
    }
    log.log("Migrated %d mnemonics", Object.keys(oldMnemonics).length)

    /**
     * Migrate Accounts
     */

    for (const oldPair of oldPairs) {
      const origin = oldPair.meta.origin as LegacyAccountOrigin

      try {
        switch (origin) {
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
              derivationPath &&
              isValidDerivationPath(derivationPath, oldPair.type)
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
              isPortfolio: !!oldPair.meta.isPortfolio,
            })
            break
          }

          default: {
            log.error("Unknown account origin", { origin: oldPair.meta.origin, pair: oldPair })
            throw new Error("Unknown origin " + oldPair.meta.origin)
          }
        }
      } catch (err) {
        log.error("Failed to migrate account", { err, oldPair })
      } finally {
        await updateMigrationProgress()
      }
    }

    /**
     * Migrate contacts
     */
    for (const oldContact of oldContacts) {
      try {
        const options: AddAccountExternalOptions = {
          type: "contact",
          name: oldContact.name,
          address: oldContact.address,
        }
        if (oldContact.genesisHash) options.genesisHash = oldContact.genesisHash

        await keyringStore.addAccountExternal(options)
      } catch (err) {
        log.warn("Failed to migrate contact", { err, oldContact })
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
      else await appStore.delete("vaultVerifierCertificateMnemonicId") // sorry!
    }
    await updateMigrationProgress() // 100%

    /**
     * Delete old data
     */
    try {
      // cleanup
      const keys = Object.keys(await chrome.storage.local.get(null)).filter((key) =>
        key.startsWith("account:0x"),
      )
      await Promise.all(keys.map(async (key) => await chrome.storage.local.remove(key)))
      await chrome.storage.local.remove("mnemonics")
      await addressBookStore.clear()
    } catch (err) {
      log.error("Migration cleanup failed", { err })
    }
  } finally {
    stopMainTimer()
    await appStore.delete("currentMigration")
  }
}
