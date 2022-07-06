import { DEBUG } from "@core/constants"
import { SubscribableStorageProvider } from "@core/libs/Store"
import { assert } from "@polkadot/util"
import { gt } from "semver"
import Browser from "webextension-polyfill"

type ONBOARDED_TRUE = "TRUE"
type ONBOARDED_FALSE = "FALSE"
type ONBOARDED_UNKNOWN = "UNKNOWN"
const TRUE: ONBOARDED_TRUE = "TRUE"
const FALSE: ONBOARDED_FALSE = "FALSE"

export type OnboardedType = ONBOARDED_TRUE | ONBOARDED_FALSE | ONBOARDED_UNKNOWN

export type AppStoreData = {
  onboarded: OnboardedType
  hideBraveWarning: boolean
  hasBraveWarningBeenShown: boolean
  analyticsRequestShown: boolean
}

const ANALYTICS_VERSION = "1.5.0"

const DEFAULT_VALUE = {
  onboarded: FALSE,
  hideBraveWarning: false,
  hasBraveWarningBeenShown: false,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  analyticsRequestShown: gt(process.env.VERSION!, ANALYTICS_VERSION), // assume user has onboarded with analytics if current version is newer
}

export class AppStore extends SubscribableStorageProvider<
  AppStoreData,
  "pri(app.onboardStatus.subscribe)"
> {
  // keeps track of 'onboarding requests' per session so that each dapp can only cause the onboarding tab to focus once
  onboardingRequestsByUrl: { [url: string]: boolean } = {}

  constructor() {
    super("app", DEFAULT_VALUE)

    // One time migration to using this store instead of storing directly in local storage from State
    Browser.storage.local.get("talismanOnboarded").then((result) => {
      const legacyOnboarded =
        result && "talismanOnboarded" in result && result.talismanOnboarded === TRUE

      if (legacyOnboarded) {
        this.set({ onboarded: TRUE })
        Browser.storage.local.remove("talismanOnboarded")
      }
    })
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
}

export const appStore = new AppStore()

if (DEBUG) {
  // helper for developers, allowing ot reset settings by calling resetAppSettings() in dev console
  // @ts-ignore
  window.resetAppSettings = () => {
    appStore.set({
      hideBraveWarning: false,
      hasBraveWarningBeenShown: false,
      analyticsRequestShown: false,
    })
  }
}
