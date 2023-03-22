import {
  FEATURE_STORE_INITIAL_DATA,
  FeaturesStoreData,
  featuresStore,
} from "@core/domains/app/store.features"
import { FeatureFlag, FeatureVariants } from "@core/domains/app/types"
import { RecoilState, atom, selectorFamily, useRecoilValue } from "recoil"

const featuresAtom = atom<FeaturesStoreData>({
  key: "featuresAtom",
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
//, V extends FeatureVariants[K]
const featureVariantsFamily = selectorFamily({
  key: "featureVariantsFamily",
  get:
    <K extends FeatureFlag>(key: K) =>
    ({ get }) => {
      const features = get(featuresAtom)
      return features.variants[key] as FeatureVariants[K]
    },
})

const featureFlagsFamily = selectorFamily({
  key: "featureFlagsFamily",
  get:
    (key: FeatureFlag) =>
    ({ get }) => {
      const variant = get(featureVariantsFamily(key))

      if (typeof variant === "undefined") return false
      if (typeof variant === "string") return true
      if (typeof variant === "boolean") return variant === true

      // force a typescript compilation error if any variant types are not handled.
      // if a developer adds a feature flag which is, for example, a number (or any other type
      // which we don't handle yet) then this compliation error will tell them that they need
      // to add an if statement above to handle that variant type.
      // without this, their new variant would always return false, and they'd be left confused
      // as to why their feature flag isn't working.
      const exhaustiveCheck: never = variant
      throw new Error(`Unhandled feature variant type ${exhaustiveCheck}`)
    },
})

export const useFeatureVariant = <K extends FeatureFlag>(feature: K) => {
  const selector = featureVariantsFamily(feature) as RecoilState<FeatureVariants[K]>
  return useRecoilValue(selector)
}
export const useIsFeatureEnabled = (feature: FeatureFlag) => {
  return useRecoilValue(featureFlagsFamily(feature))
}
