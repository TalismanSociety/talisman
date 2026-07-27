import { log } from "@common/log"
import { normalizeAddress } from "@talismn/crypto"

import { type Migration, MigrationFunction } from "../../../libs/migrations/types"
import { StorageProvider } from "../../../libs/Store"
import { chaindataProvider } from "../../../rpcs/chaindata"
import { activeChainsStore } from "../../chains/store.activeChains"
import { activeEvmNetworksStore } from "../../ethereum/store.activeEvmNetworks"
import { addressBookStore } from "../store.addressBook"
import { settingsStore } from "../store.settings"

export const cleanBadContacts: Migration = {
  forward: new MigrationFunction(async (_context) => {
    const dirtyContacts = await addressBookStore.get()
    const cleanContacts = Object.fromEntries(
      Object.entries(dirtyContacts).filter(([address]) => {
        try {
          normalizeAddress(address)
          return true
        } catch (error) {
          log.log("Error normalising address", error)
          return false
        }
      })
    )
    await addressBookStore.replace(cleanContacts)
  }),
  // no way back
}

export const hideGetStartedIfFunded: Migration = {
  forward: new MigrationFunction(async (_context) => {
    // deprecated
  }),
  // no way back
}

export const migrateAutoLockTimeoutToMinutes: Migration = {
  forward: new MigrationFunction(async (_) => {
    const legacySettingsStore = new StorageProvider<{ autoLockTimeout: number }>("settings")
    const currentValue = await legacySettingsStore.get("autoLockTimeout")
    if (currentValue === 0) await settingsStore.set({ autoLockMinutes: 0 })
    else await settingsStore.set({ autoLockMinutes: currentValue / 60 })
  }),
  backward: new MigrationFunction(async (_) => {
    const currentValue = await settingsStore.get("autoLockMinutes")
    if (currentValue === 0) return

    const legacySettingsStore = new StorageProvider<{ autoLockTimeout: number }>("settings")
    await legacySettingsStore.set({ autoLockTimeout: currentValue * 60 })
  }),
}

export const migrateEnabledTestnets: Migration = {
  forward: new MigrationFunction(async (_) => {
    const legacySettingsStore = new StorageProvider<{ useTestnets: boolean }>("settings")
    const useTestnets = await legacySettingsStore.get("useTestnets")

    // if user doesn't have testnets enabled, reset active status for all testnets
    if (!useTestnets) {
      const [chains, evmNetworks] = await Promise.all([
        chaindataProvider.getNetworks("polkadot"),
        chaindataProvider.getNetworks("ethereum"),
      ])

      const chainTestnetIds = chains.filter((n) => n.isTestnet).map((n) => n.id)
      await activeChainsStore.mutate((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([id]) => !chainTestnetIds.includes(id)))
      )

      const evmTestnetIds = evmNetworks.filter((n) => n.isTestnet).map((n) => n.id)
      await activeEvmNetworksStore.mutate((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([id]) => !evmTestnetIds.includes(id)))
      )
    }

    // delete setting
    await legacySettingsStore.delete("useTestnets")
  }),
}

export const clearLegacyBiometricStore: Migration = {
  forward: new MigrationFunction(async (_) => {
    // biometric unlock was renamed to smart unlock before it ever shipped. the enrollment can't be
    // carried over - the key derivation changed with it - so drop the old storage key instead of
    // leaving a blob nothing can decrypt. anyone who enabled it on a dev build has to enable it
    // again, and can remove the leftover passkey from their system settings
    await chrome.storage.local.remove("biometric")
  }),
  // no way back
}
