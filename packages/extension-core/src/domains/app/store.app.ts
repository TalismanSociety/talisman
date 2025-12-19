import { DEBUG, IS_FIREFOX } from "extension-shared"
import { gt } from "semver"

import { GeneralReport } from "../../libs/GeneralReport"
import { migratePasswordV2ToV1 } from "../../libs/migrations/legacyMigrations"
import { StorageProvider } from "../../libs/Store"
import { TalismanNotOnboardedError } from "./utils"

type ONBOARDED_TRUE = "TRUE"
type ONBOARDED_FALSE = "FALSE"
type ONBOARDED_UNKNOWN = "UNKNOWN"
const TRUE: ONBOARDED_TRUE = "TRUE"
const FALSE: ONBOARDED_FALSE = "FALSE"
const UNKNOWN: ONBOARDED_UNKNOWN = "UNKNOWN"

type CurrentMigration = {
  name: string
  progress?: number // ratio between 0 and 1
  errors?: string[]
  acknowledgeRequest?: string // message that will be shown to the user along with a "continue" button
  acknowledged?: boolean // whether the user has clicked "continue"
}

export type OnboardedType = ONBOARDED_TRUE | ONBOARDED_FALSE | ONBOARDED_UNKNOWN

export type AppStoreData = {
  onboarded: OnboardedType
  hideBraveWarning: boolean
  hasBraveWarningBeenShown: boolean
  analyticsRequestShown: boolean
  analyticsReportCreatedAt?: number
  analyticsReport?: GeneralReport
  lastWalletUpgradedEvent?: string
  hideBackupWarningUntil?: number
  popupSizeDelta: [number, number]
  vaultVerifierCertificateMnemonicId?: string | null
  isAssetDiscoveryScanPending?: boolean
  showLedgerPolkadotGenericMigrationAlert?: boolean
  hideManageAccountsWelcome?: boolean
  hideBittensorSubnetStakeWarning?: boolean
  hideGetStarted?: boolean

  // dismissed banners
  hideUnifiedAddressBanner?: boolean
  hideAutonomysQuestBanner?: boolean
  hideSeekBenefitsBanner?: boolean
  hideSeekPresaleBanner?: boolean
  hideAssetHubMigrationBanner?: boolean

  // represents a migration that is currently running
  currentMigration?: CurrentMigration
}

const ANALYTICS_VERSION = "1.5.0"
const BACKUP_WARNING_SNOOZE = 1000 * 60 * 60 * 24 * 3 // 1000ms x 60 x 60 x 24 x 3 == 3 days in milliseconds

export const DEFAULT_APP_STATE: AppStoreData = {
  onboarded: UNKNOWN,
  hideBraveWarning: false,
  hasBraveWarningBeenShown: false,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  analyticsRequestShown: gt(process.env.VERSION!, ANALYTICS_VERSION), // assume user has onboarded with analytics if current version is newer
  popupSizeDelta: [0, IS_FIREFOX ? 30 : 0],
  showLedgerPolkadotGenericMigrationAlert: false,
}

export class AppStore extends StorageProvider<AppStoreData> {
  constructor() {
    super("app", DEFAULT_APP_STATE)

    // One time migration to using this store instead of storing directly in local storage from State
    chrome.storage.local.get("talismanOnboarded").then((result) => {
      const legacyOnboarded =
        result && "talismanOnboarded" in result && result.talismanOnboarded === TRUE

      if (legacyOnboarded) {
        this.set({ onboarded: TRUE })
        chrome.storage.local.remove("talismanOnboarded")
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
    const isOnboarded = await this.getIsOnboarded()
    if (!isOnboarded) throw new TalismanNotOnboardedError()

    return true
  }

  snoozeBackupReminder() {
    return this.set({ hideBackupWarningUntil: Date.now() + BACKUP_WARNING_SNOOZE })
  }
}

export const appStore = new AppStore()

// helpers for developers
if (DEBUG) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hostObj = globalThis as any

  hostObj.resetAppSettings = () => {
    appStore.set({
      hideBraveWarning: false,
      hasBraveWarningBeenShown: false,
      analyticsRequestShown: false,
      hideBackupWarningUntil: undefined,
      hideManageAccountsWelcome: false,
      hideBittensorSubnetStakeWarning: false,
      hideGetStarted: false,
      hideUnifiedAddressBanner: false,
      hideAutonomysQuestBanner: false,
      hideSeekBenefitsBanner: false,
      hideSeekPresaleBanner: false,
      hideAssetHubMigrationBanner: false,
    })
  }
  hostObj.setAppSettings = (settings: Partial<AppStoreData>) => {
    appStore.set(settings)
  }

  hostObj.migratePasswordV2ToV1 = migratePasswordV2ToV1
}
