import { TokenRateCurrency } from "@talismn/token-rates"
import { IS_FIREFOX } from "extension-shared"

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
  autoLockMinutes: number
  spiritClanFeatures: boolean
  selectableCurrencies: TokenRateCurrency[]
  selectedCurrency: TokenRateCurrency
  newFeaturesDismissed: string
  autoRiskScan?: boolean // undefined = user has never been prompted to use the feature
  nftsViewMode: "list" | "tiles"
  nftsSortBy: "floor" | "name" | "date"
  tokensSortBy: "name" | "total" | "locked" | "available"
  developerMode: boolean
}

export class SettingsStore extends StorageProvider<SettingsStoreData> {}

export const DEFAULT_SETTINGS: SettingsStoreData = {
  useErrorTracking: !IS_FIREFOX,
  useTestnets: false,
  identiconType: "talisman-orb",
  useAnalyticsTracking: undefined, // undefined for onboarding
  hideBalances: false,
  hideDust: false,
  allowNotifications: true,
  autoLockMinutes: 0,
  spiritClanFeatures: true,
  selectableCurrencies: ["usd", "dot", "eth"],
  selectedCurrency: "usd",
  newFeaturesDismissed: "0",
  nftsViewMode: "tiles",
  tokensSortBy: "total",
  nftsSortBy: "date",
  developerMode: false,
}

export const settingsStore = new SettingsStore("settings", DEFAULT_SETTINGS)
