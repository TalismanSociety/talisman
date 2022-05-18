import { StorageProvider } from "@core/libs/Store"
import { IdenticonType } from "@core/types"

export interface SettingsStoreData {
  useErrorTracking: boolean
  useTestnets: boolean
  identiconType: IdenticonType
  useCustomEthereumNetworks: boolean
  hideBalances: boolean
}

class SettingsStore extends StorageProvider<SettingsStoreData> {}

export const settingsStore = new SettingsStore("settings", {
  useErrorTracking: false,
  useTestnets: false,
  identiconType: "talisman-orb",
  useCustomEthereumNetworks: false,
  hideBalances: false,
})
