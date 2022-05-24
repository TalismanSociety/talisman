import { assert } from "@polkadot/util"
import Browser from "webextension-polyfill"
import { SubscribableStorageProvider } from "@core/libs/Store"
import { DEBUG } from "@core/constants"

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
}

const DEFAULT_VALUE = {
  onboarded: FALSE,
  hideBraveWarning: false,
  hasBraveWarningBeenShown: false,
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
        result &&
        (result as Object).hasOwnProperty("talismanOnboarded") &&
        result.talismanOnboarded === TRUE

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

const appStore = new AppStore()

export default appStore

if (DEBUG) {
  // helper for developers, allowing ot reset settings by calling resetBraveFlags() in dev console
  // @ts-ignore
  window.resetBraveFlags = () => {
    appStore.set({
      hideBraveWarning: false,
      hasBraveWarningBeenShown: false,
    })
  }
}
