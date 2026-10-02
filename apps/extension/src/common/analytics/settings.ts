import type { AppStoreData } from "@core/domains/app/store.app"
import type { SettingsStoreData } from "@core/domains/app/store.settings"

export const SETTING_KEYS = [
  "blurBalances",
  "hideSmallBalance",
  "currency",
  "tokensSortBy",
  "identiconType",
  "allowNotifications",
  "autoRiskScan",
  "autoDappScan",
  "autoTokenScan",
  "nftsViewMode",
  "nftsSortBy",
  "earnPositionsSortBy",
  "earnPositionsGroupBy",
  "earnDiscoverSortBy",
  "earnDiscoverTypeFilter",
  "earnDiscoverProviderFilter",
  "developerMode",
  "polkadotVaultSignWithProof",
  "ledgerTransportType",
  "swapSlippage",
  "hideGetStarted",
  "hideBraveWarning",
  "hideEarnDisclaimer",
  "hideManageAccountsWelcome",
  "hideBittensorSubnetStakeWarning",
  "hideBittensorConvictionLockInfo",
  "hideBittensorRootRewardsInfo",
] as const
export type SettingKey = (typeof SETTING_KEYS)[number]

export type SettingValue = string | number | boolean | null
export type SettingChange = { key: SettingKey; value: SettingValue }

type SettingRule = { key: SettingKey; type: "boolean" | "enum" | "number" }

type NotASetting =
  | "consent: the engine reports it"
  | "own event"
  | "not a user choice"
  | "a list, not one value"
  | "dev only"

const bool = (key: SettingKey): SettingRule => ({ key, type: "boolean" })
const enumOf = (key: SettingKey): SettingRule => ({ key, type: "enum" })

const SETTINGS: { readonly [K in keyof SettingsStoreData]-?: SettingRule | NotASetting } = {
  useErrorTracking: "consent: the engine reports it",
  useAnalyticsTracking: "consent: the engine reports it",
  identiconType: enumOf("identiconType"),
  hideBalances: bool("blurBalances"),
  hideDust: bool("hideSmallBalance"),
  allowNotifications: bool("allowNotifications"),
  selectedAccount: "not a user choice",
  collapsedFolders: "not a user choice",
  autoLockMinutes: "own event",
  selectableCurrencies: "a list, not one value",
  selectedCurrency: enumOf("currency"),
  newFeaturesDismissed: "not a user choice",
  autoRiskScan: bool("autoRiskScan"),
  autoDappScan: bool("autoDappScan"),
  autoTokenScan: bool("autoTokenScan"),
  nftsViewMode: enumOf("nftsViewMode"),
  nftsSortBy: enumOf("nftsSortBy"),
  tokensSortBy: enumOf("tokensSortBy"),
  earnPositionsSortBy: enumOf("earnPositionsSortBy"),
  earnPositionsGroupBy: enumOf("earnPositionsGroupBy"),
  earnDiscoverSortBy: enumOf("earnDiscoverSortBy"),
  earnDiscoverTypeFilter: enumOf("earnDiscoverTypeFilter"),
  earnDiscoverProviderFilter: enumOf("earnDiscoverProviderFilter"),
  developerMode: bool("developerMode"),
  polkadotVaultSignWithProof: bool("polkadotVaultSignWithProof"),
  ledgerTransportType: enumOf("ledgerTransportType"),
  dtaoSlippage: "own event",
  swapSlippage: { key: "swapSlippage", type: "number" },
  disableBalanceFetching: "dev only",
}

const APP_FLAGS: { readonly [K in keyof AppStoreData]-?: SettingRule | NotASetting } = {
  onboarded: "not a user choice",
  hideBraveWarning: bool("hideBraveWarning"),
  hasBraveWarningBeenShown: "not a user choice",
  analyticsRequestShown: "not a user choice",
  hideBackupWarningUntil: "own event",
  popupSizeDelta: "not a user choice",
  vaultVerifierCertificateMnemonicId: "own event",
  isAssetDiscoveryScanPending: "not a user choice",
  showLedgerPolkadotGenericMigrationAlert: "not a user choice",
  hideManageAccountsWelcome: bool("hideManageAccountsWelcome"),
  hideBittensorSubnetStakeWarning: bool("hideBittensorSubnetStakeWarning"),
  hideBittensorConvictionLockInfo: bool("hideBittensorConvictionLockInfo"),
  hideBittensorRootRewardsInfo: bool("hideBittensorRootRewardsInfo"),
  hideGetStarted: bool("hideGetStarted"),
  hideEarnDisclaimer: bool("hideEarnDisclaimer"),
  currentMigration: "not a user choice",
}

export const SETTING_ENUM_VALUE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,31}$/

const parseValue = (type: SettingRule["type"], value: unknown): SettingValue | undefined => {
  if (value === undefined || value === null) return null
  switch (type) {
    case "boolean":
      return typeof value === "boolean" ? value : undefined
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? value : undefined
    case "enum":
      return typeof value === "string" && SETTING_ENUM_VALUE.test(value) ? value : undefined
  }
}

const toChange = (
  rule: SettingRule | NotASetting | undefined,
  value: unknown
): SettingChange | null => {
  if (!rule || typeof rule === "string") return null
  const parsed = parseValue(rule.type, value)
  return parsed === undefined ? null : { key: rule.key, value: parsed }
}

export const settingChangeOf = <K extends keyof SettingsStoreData>(
  key: K,
  value: SettingsStoreData[K]
): SettingChange | null => toChange(SETTINGS[key], value)

export const appFlagChangeOf = <K extends keyof AppStoreData>(
  key: K,
  value: AppStoreData[K]
): SettingChange | null => toChange(APP_FLAGS[key], value)
