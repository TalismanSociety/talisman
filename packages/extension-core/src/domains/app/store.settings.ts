import { TokenRateCurrency } from "@talismn/token-rates"

import { StorageProvider } from "../../libs/Store"
import { IdenticonType } from "../accounts/types"

export interface SettingsStoreData {
  useErrorTracking: boolean
  useTestnets: boolean
  identiconType: IdenticonType
  useAnalyticsTracking?: boolean // undefined during onboarding
  hideBalances: boolean
  hideDust: boolean
  allowNotifications: boolean
  selectedAccount?: string // undefined = show all accounts
  collapsedFolders?: string[] // persists the collapsed folders in the dashboard account picker
  autoLockTimeout: 0 | 300 | 1800 | 3600
  spiritClanFeatures: boolean
  selectableCurrencies: TokenRateCurrency[]
  selectedCurrency: TokenRateCurrency
  newFeaturesDismissed: string
}

export class SettingsStore extends StorageProvider<SettingsStoreData> {}

export const DEFAULT_SETTINGS: SettingsStoreData = {
  useErrorTracking: true,
  useTestnets: false,
  identiconType: "talisman-orb",
  useAnalyticsTracking: undefined, // undefined for onboarding
  hideBalances: false,
  hideDust: false,
  allowNotifications: true,
  autoLockTimeout: 0,
  spiritClanFeatures: true,
  selectableCurrencies: ["usd", "dot", "eth"],
  selectedCurrency: "usd",
  newFeaturesDismissed: "0",
}

export const settingsStore = new SettingsStore("settings", DEFAULT_SETTINGS)
