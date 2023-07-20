import {
  FEATURE_STORE_INITIAL_DATA,
  FeaturesStoreData,
  featuresStore,
} from "@core/domains/app/store.features"
import { FeatureFlag, FeatureVariants } from "@core/domains/app/types"
import { RecoilState, atom, selectorFamily, useRecoilValue } from "recoil"

const featuresState = atom<FeaturesStoreData>({
  key: "featuresState",
  default: FEATURE_STORE_INITIAL_DATA,
  effects: [
    ({ setSelf }) => {
      const sub = featuresStore.observable.subscribe(setSelf)
      return () => {
        sub.unsubscribe()
      }
    },
  ],
})

const featureVariantsQuery = selectorFamily({
  key: "featureVariantsQuery",
  get:
    <K extends FeatureFlag>(key: K) =>
    ({ get }) => {
      const { variants } = get(featuresState)
      return variants[key] as FeatureVariants[K]
    },
})

const featureFlagsQuery = selectorFamily({
  key: "featureFlagsQuery",
  get:
    (key: FeatureFlag) =>
    ({ get }) => {
      const { features } = get(featuresState)
      return features.includes(key)
    },
})

export const useFeatureVariant = <K extends FeatureFlag>(feature: K) => {
  const selector = featureVariantsQuery(feature) as RecoilState<FeatureVariants[K]>
  return useRecoilValue(selector)
}
export const useIsFeatureEnabled = (feature: FeatureFlag) => {
  return useRecoilValue(featureFlagsQuery(feature))
}
