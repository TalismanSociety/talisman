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
