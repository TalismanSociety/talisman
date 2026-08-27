import { DEBUG, IS_FIREFOX } from "@common/constants"
import type { TokenRateCurrency } from "@talismn/token-rates"

import { StorageProvider } from "../../libs/Store"
import type { IdenticonType } from "../accounts/types"
import { DEFAULT_AUTO_LOCK_MINUTES } from "./autoLock"

export type LedgerTransportType = "usb" | "hid"

export interface SettingsStoreData {
  useErrorTracking: boolean
  identiconType: IdenticonType
  useAnalyticsTracking?: boolean // undefined during onboarding
  hideBalances: boolean
  hideDust: boolean
  allowNotifications: boolean
  selectedAccount?: string // undefined = show all accounts
  collapsedFolders?: string[] // persists the collapsed folders in the dashboard account picker
  autoLockMinutes: number
  selectableCurrencies: TokenRateCurrency[]
  selectedCurrency: TokenRateCurrency
  newFeaturesDismissed: string
  autoRiskScan?: boolean // undefined = user has never been prompted to use the feature
  nftsViewMode: "list" | "tiles"
  nftsSortBy: "value" | "name" | "date"
  tokensSortBy: "name" | "total" | "locked" | "available"
  earnPositionsSortBy: "total" | "name"
  earnPositionsGroupBy: "token" | "network" | "none"
  earnDiscoverSortBy: "yield" | "name" | "assets"
  earnDiscoverTypeFilter: string | null
  earnDiscoverProviderFilter: string | null
  developerMode: boolean
  polkadotVaultSignWithProof: boolean
  ledgerTransportType: LedgerTransportType
  dtaoSlippage?: number
  swapSlippage: number
  /** rotate bitcoin receive addresses (fresh address per receive) instead of showing a stable one */
  btcFreshReceiveAddress?: boolean
  /** display bitcoin amounts in satoshis instead of BTC */
  btcDisplaySats?: boolean
  /** Dev-only: disables live balance fetching while preserving cached balances */
  disableBalanceFetching: boolean
}

class SettingsStore extends StorageProvider<SettingsStoreData> {}

const DEFAULT_SETTINGS: SettingsStoreData = {
  useErrorTracking: !IS_FIREFOX,
  identiconType: "talisman-orb",
  useAnalyticsTracking: undefined, // undefined for onboarding
  hideBalances: false,
  hideDust: false,
  allowNotifications: true,
  autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES,
  selectableCurrencies: ["usd", "tao", "eth"],
  selectedCurrency: "usd",
  newFeaturesDismissed: "0",
  nftsViewMode: "tiles",
  tokensSortBy: "total",
  earnPositionsSortBy: "total",
  earnPositionsGroupBy: "none",
  earnDiscoverSortBy: "yield",
  earnDiscoverTypeFilter: null,
  earnDiscoverProviderFilter: null,
  nftsSortBy: "date",
  developerMode: false,
  polkadotVaultSignWithProof: true,
  ledgerTransportType: "hid",
  swapSlippage: 0.5,
  disableBalanceFetching: false,
}

export const settingsStore = new SettingsStore("settings", DEFAULT_SETTINGS)

if (DEBUG) {
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  const hostObj = globalThis as any

  hostObj.resetSettings = () => {
    settingsStore.mutate(() => DEFAULT_SETTINGS)
  }

  hostObj.toggleBalanceFetching = () => {
    settingsStore.mutate((prev) => {
      const next = !prev.disableBalanceFetching
      // biome-ignore lint/suspicious/noConsole: dev helper
      console.log(`[balances] fetching ${next ? "DISABLED" : "ENABLED"}`)
      return { ...prev, disableBalanceFetching: next }
    })
  }

  // Warn loudly on every startup if balance fetching has been disabled
  settingsStore.get().then((settings) => {
    if (settings.disableBalanceFetching) {
      // biome-ignore lint/suspicious/noConsole: dev helper
      console.warn(
        "%c ⚠️ BALANCE FETCHING IS DISABLED ⚠️ %c\nLive balance updates are turned off. Cached/stale balances will be shown instead.\nRun %ctoggleBalanceFetching()%c in this console to re-enable.",
        "background: #ff4400; color: white; font-size: 16px; font-weight: bold; padding: 8px 12px; border-radius: 4px;",
        "font-size: 13px; padding: 4px 0;",
        "background: #333; color: #0f0; font-size: 13px; padding: 2px 6px; border-radius: 3px;",
        "font-size: 13px;"
      )
    }
  })
}
