import { IdenticonType } from "@core/domains/accounts/types"
import { StorageProvider } from "@core/libs/Store"

export interface SettingsStoreData {
  useErrorTracking: boolean
  useTestnets: boolean
  identiconType: IdenticonType
  useAnalyticsTracking: boolean
  hideBalances: boolean
  allowNotifications: boolean
  shouldMimicMetaMask: boolean
}

export class SettingsStore extends StorageProvider<SettingsStoreData> {}

export const settingsStore = new SettingsStore("settings", {
  useErrorTracking: false,
  useTestnets: false,
  identiconType: "talisman-orb",
  useAnalyticsTracking: false,
  hideBalances: false,
  allowNotifications: true,
  shouldMimicMetaMask: false,
})
