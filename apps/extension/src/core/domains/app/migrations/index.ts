import { log } from "@common/log"
import { normalizeAddress } from "@talismn/crypto"

import { type Migration, MigrationFunction } from "../../../libs/migrations/types"
import { StorageProvider } from "../../../libs/Store"
import { chaindataProvider } from "../../../rpcs/chaindata"
import { activeChainsStore } from "../../chains/store.activeChains"
import { activeEvmNetworksStore } from "../../ethereum/store.activeEvmNetworks"
import { DEFAULT_AUTO_LOCK_MINUTES, isUsableAutoLockDuration } from "../autoLock"
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
    const legacySeconds = await legacySettingsStore.get("autoLockTimeout")

    // an install that never wrote the legacy setting keeps the default
    if (!isUsableAutoLockDuration(legacySeconds)) return

    await settingsStore.set({ autoLockMinutes: legacySeconds / 60 })
  }),
  backward: new MigrationFunction(async (_) => {
    const currentValue = await settingsStore.get("autoLockMinutes")
    if (currentValue === 0) return

    const legacySettingsStore = new StorageProvider<{ autoLockTimeout: number }>("settings")
    await legacySettingsStore.set({ autoLockTimeout: currentValue * 60 })
  }),
}

/**
 * `migrateAutoLockTimeoutToMinutes` used to divide an absent legacy setting by 60, persisting
 * `NaN` (stored as `null`) as the auto-lock duration, which reads as "auto-lock disabled".
 * The migration is already recorded as applied on those installs, so the value is repaired here.
 */
export const repairAutoLockMinutes: Migration = {
  forward: new MigrationFunction(async (_) => {
    const autoLockMinutes = await settingsStore.get("autoLockMinutes")
    if (isUsableAutoLockDuration(autoLockMinutes)) return

    await settingsStore.set({ autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES })
  }),
  // no way back
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
