import { IdenticonType } from "@core/domains/accounts/types"
import { StorageProvider } from "@core/libs/Store"

export interface SettingsStoreData {
  useErrorTracking: boolean
  useTestnets: boolean
  identiconType: IdenticonType
  useAnalyticsTracking?: boolean // undefined during onboarding
  hideBalances: boolean
  allowNotifications: boolean
  selectedAccount?: string // undefined = show all accounts
  autoLockTimeout: 0 | 300 | 1800 | 3600
}

export class SettingsStore extends StorageProvider<SettingsStoreData> {}

export const settingsStore = new SettingsStore("settings", {
  useErrorTracking: true,
  useTestnets: false,
  identiconType: "talisman-orb",
  useAnalyticsTracking: undefined, // undefined for onboarding
  hideBalances: false,
  allowNotifications: true,
  autoLockTimeout: 0,
})
