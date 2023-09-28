import { DEBUG } from "@core/constants"
import { StorageProvider } from "@core/libs/Store"
import Browser from "webextension-polyfill"

import { FeatureFlag, FeatureVariants } from "./types"

export interface FeaturesStoreData {
  // features enabled on Posthog
  features: FeatureFlag[]

  // variants are not used for now but could be a powerful way to enable/disable network or token specific behavior
  variants: FeatureVariants
}

export const FEATURE_STORE_INITIAL_DATA: FeaturesStoreData = {
  features: [],
  variants: {} as FeatureVariants,
}

export class FeaturesStore extends StorageProvider<FeaturesStoreData> {
  async isFeatureEnabled(feature: FeatureFlag) {
    const store = await this.get()
    return store.features.includes(feature)
  }

  update(variants: FeatureVariants) {
    return featuresStore.set({
      features: Object.keys(variants).filter(
        (k) => !!variants[k as keyof FeatureVariants]
      ) as FeatureFlag[],
      variants,
    })
  }
}

export const featuresStore = new FeaturesStore("features", FEATURE_STORE_INITIAL_DATA)

// while in dev mode, turn on all features
if (DEBUG && Browser.extension.getBackgroundPage() === window) {
  // @devs : add all feature flags here, comment some if needed for testing
  const DEV_FEATURE_VARIANTS: FeatureVariants = {
    BUY_CRYPTO: true, // nav buttons + button in fund wallet component
    LINK_TX_HISTORY: true,
    LINK_STAKING: true,
    USE_ONFINALITY_API_KEY: false,
    TEST_VARIANT: "VARIANT1",
  }

  featuresStore.update(DEV_FEATURE_VARIANTS)
}
