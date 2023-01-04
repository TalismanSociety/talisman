import { StorageProvider } from "@core/libs/Store"

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
}

export const featuresStore = new FeaturesStore("features", FEATURE_STORE_INITIAL_DATA)

// in dev build the developer may or not have a posthog token
// without token, posthog won't be initialized and won't update the store
if (!process.env.POSTHOG_AUTH_TOKEN) {
  // @devs : add all feature flags here, comment some if needed for testing
  const DEV_FEATURE_VARIANTS: FeatureVariants = {
    WALLET_FUNDING: true, // shown when onboarding until wallet has funds
    BUY_CRYPTO: true, // nav buttons + button in fund wallet component
    POPUP_BOTTOM_NAV_VARIANT: "WITH_TOOLTIP",
    FEE_FROM_STATE_CALL: true,
    LINK_TX_HISTORY: true,
    LINK_STAKING: true,
  }
  featuresStore.set({
    features: Object.keys(DEV_FEATURE_VARIANTS) as FeatureFlag[],
    variants: DEV_FEATURE_VARIANTS,
  })
}
