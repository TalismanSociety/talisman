import { IdenticonType } from "@core/domains/accounts/types"
import { StorageProvider } from "@core/libs/Store"

export interface SettingsStoreData {
  useErrorTracking: boolean
  useTestnets: boolean
  identiconType: IdenticonType
  useAnalyticsTracking?: boolean // undefined during onboarding
  hideBalances: boolean
  allowNotifications: boolean // undefined = show all accounts
  selectedAccount?: string
  shouldMimicMetaMask: boolean
}

export class SettingsStore extends StorageProvider<SettingsStoreData> {}

export const settingsStore = new SettingsStore("settings", {
  useErrorTracking: true,
  useTestnets: false,
  identiconType: "talisman-orb",
  useAnalyticsTracking: undefined, // undefined for onboarding
  hideBalances: false,
  allowNotifications: true,
  shouldMimicMetaMask: false,
})
