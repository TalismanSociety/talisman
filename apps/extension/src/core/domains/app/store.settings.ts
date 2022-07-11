import { StorageProvider } from "@core/libs/Store"
import { IdenticonType } from "@core/types"

export interface SettingsStoreData {
  useErrorTracking: boolean
  useTestnets: boolean
  identiconType: IdenticonType
  useAnalyticsTracking: boolean
  useCustomEthereumNetworks: boolean
  hideBalances: boolean
  allowNotifications: boolean
  selectedAccount: string | undefined
  shouldMimicMetaMask: boolean
}

export class SettingsStore extends StorageProvider<SettingsStoreData> {}

export const settingsStore = new SettingsStore("settings", {
  useErrorTracking: false,
  useTestnets: false,
  identiconType: "talisman-orb",
  useAnalyticsTracking: false,
  useCustomEthereumNetworks: false,
  hideBalances: false,
  allowNotifications: true,
  shouldMimicMetaMask: false,
})
