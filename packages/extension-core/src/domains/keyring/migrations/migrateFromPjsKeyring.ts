import legacyKeyring from "@polkadot/ui-keyring"
import { AddAccountExternalOptions } from "@talismn/keyring"
import { HexString, log } from "extension-shared"
import { capitalize } from "lodash"

import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { awaitKeyringLoaded } from "../../../util/awaitKeyringLoaded"
import { LegacyAccountOrigin, SubstrateLedgerAppType } from "../../accounts/types"
import { mnemonicsStore } from "../../mnemonics/store"
import { getSecretKeyFromPjsJson } from "../getSecretKeyFromPjsJson"
import { keyringStore } from "../store"

export const migrateFromPjsKeyring: Migration = {
  forward: new MigrationFunction(({ password }) => executeMigrationFromPjsKeyring(password)),
  // no way back
}

export const executeMigrationFromPjsKeyring = async (password: string) => {
  try {
    await awaitKeyringLoaded()

    // ensure any left over from a previous migration attempt is removed
    await keyringStore.reset()

    // map old to new mnemonic ids so we know how to replug each account derived from them
    const oldToNewMnemonicId = new Map<string, string>()

    /**
     * Migrate Mnemonics
     */

    const oldMnemonics = await mnemonicsStore.get()
    for (const [oldMnemonicId, { name, confirmed }] of Object.entries(oldMnemonics)) {
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
    }
    log.log("Migrated %d mnemonics", Object.keys(oldMnemonics).length)

    /**
     * Migrate Accounts
     */
    const oldPairs = legacyKeyring.getPairs()
    for (const oldPair of oldPairs) {
      const origin = oldPair.meta.origin as LegacyAccountOrigin

      switch (origin) {
        case LegacyAccountOrigin.Talisman: {
          const mnemonicId =
            typeof oldPair.meta.mnemonicId === "string"
              ? oldToNewMnemonicId.get(oldPair.meta.mnemonicId)
              : null
          const derivationPath = oldPair.meta.derivationPath as string | undefined

          if (mnemonicId && derivationPath) {
            // keep the "link" to associated mnemonic by rederiving the account from it
            await keyringStore.addAccountDerive({
              type: "existing-mnemonic",
              name: oldPair.meta.name ?? `Keypair ${oldPair.address}`,
              curve: oldPair.type,
              mnemonicId,
              derivationPath,
            })
          } else {
            // import as standalone keypair
            await keyringStore.addAccountKeypair({
              name: oldPair.meta.name ?? oldPair.address,
              curve: oldPair.type,
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
    }
    log.log("Migrated %d accounts", oldPairs.length)

    /**
     * Migrate contacts
     */

    /**
     * Fix catalog
     */
  } catch (cause) {
    log.error("Migration failed", { cause })
    throw new Error("Migration failed", { cause })
  }
}
