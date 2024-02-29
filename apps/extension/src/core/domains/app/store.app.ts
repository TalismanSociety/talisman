import { DEBUG, IS_FIREFOX } from "@core/constants"
import { StakingSupportedChain } from "@core/domains/staking/types"
import { StorageProvider } from "@core/libs/Store"
import { assert } from "@polkadot/util"
import { gt } from "semver"
import Browser from "webextension-polyfill"

import { migratePasswordV2ToV1 } from "../../libs/migrations/legacyMigrations"

type ONBOARDED_TRUE = "TRUE"
type ONBOARDED_FALSE = "FALSE"
type ONBOARDED_UNKNOWN = "UNKNOWN"
const TRUE: ONBOARDED_TRUE = "TRUE"
const FALSE: ONBOARDED_FALSE = "FALSE"
const UNKNOWN: ONBOARDED_UNKNOWN = "UNKNOWN"

export type OnboardedType = ONBOARDED_TRUE | ONBOARDED_FALSE | ONBOARDED_UNKNOWN

export type AppStoreData = {
  onboarded: OnboardedType
  hideBraveWarning: boolean
  hasBraveWarningBeenShown: boolean
  analyticsRequestShown: boolean
  analyticsReportSent?: number
  hideBackupWarningUntil?: number
  hasSpiritKey: boolean
  hideStakingBanner: StakingSupportedChain[]
  needsSpiritKeyUpdate: boolean
  popupSizeDelta: [number, number]
  vaultVerifierCertificateMnemonicId?: string | null
  showAssetDiscoveryAlert?: boolean
  dismissedAssetDiscoveryAlertScanId?: string
  isAssetDiscoveryScanPending?: boolean
}

const ANALYTICS_VERSION = "1.5.0"
const BACKUP_WARNING_SNOOZE = 60 * 60 * 24 * 3 * 10000 // 3 days

export const DEFAULT_APP_STATE: AppStoreData = {
  onboarded: UNKNOWN,
  hideBraveWarning: false,
  hasBraveWarningBeenShown: false,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  analyticsRequestShown: gt(process.env.VERSION!, ANALYTICS_VERSION), // assume user has onboarded with analytics if current version is newer
  hasSpiritKey: false,
  needsSpiritKeyUpdate: false,
  hideStakingBanner: [],
  popupSizeDelta: [0, IS_FIREFOX ? 30 : 0],
  showAssetDiscoveryAlert: false,
}

export class AppStore extends StorageProvider<AppStoreData> {
  // keeps track of 'onboarding requests' per session so that each dapp can only cause the onboarding tab to focus once
  onboardingRequestsByUrl: { [url: string]: boolean } = {}

  constructor() {
    super("app", DEFAULT_APP_STATE)

    // One time migration to using this store instead of storing directly in local storage from State
    Browser.storage.local.get("talismanOnboarded").then((result) => {
      const legacyOnboarded =
        result && "talismanOnboarded" in result && result.talismanOnboarded === TRUE

      if (legacyOnboarded) {
        this.set({ onboarded: TRUE })
        Browser.storage.local.remove("talismanOnboarded")
      }
    })

    this.init()
  }

  async init() {
    // Onboarding page won't display with UNKNOWN
    // Initialize to FALSE after install
    if ((await this.get("onboarded")) === UNKNOWN) await this.set({ onboarded: FALSE })
  }

  async getIsOnboarded() {
    return (await this.get("onboarded")) === TRUE
  }

  async setOnboarded() {
    return (await this.set({ onboarded: TRUE })).onboarded
  }

  async ensureOnboarded() {
    assert(
      await this.getIsOnboarded(),
      "Talisman extension has not been configured yet. Please continue with onboarding."
    )
    return true
  }

  snoozeBackupReminder() {
    return this.set({ hideBackupWarningUntil: Date.now() + BACKUP_WARNING_SNOOZE })
  }
}

export const appStore = new AppStore()

if (DEBUG) {
  // helper for developers, allowing to reset settings by calling resetAppSettings() in dev console
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).resetAppSettings = () => {
    appStore.set({
      hideBraveWarning: false,
      hasBraveWarningBeenShown: false,
      analyticsRequestShown: false,
      hideStakingBanner: [],
      hideBackupWarningUntil: undefined,
    })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).setAppSettings = (settings: Partial<AppStoreData>) => {
    appStore.set(settings)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).migratePasswordV2ToV1 = migratePasswordV2ToV1
}
