import {
  FEATURE_STORE_INITIAL_DATA,
  FeaturesStoreData,
  featuresStore,
} from "@core/domains/app/store.features"
import { FeatureFlag, FeatureVariants } from "@core/domains/app/types"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useEffect, useMemo, useState } from "react"

const useFeaturesProvider = () => {
  const [data, setData] = useState<FeaturesStoreData>(FEATURE_STORE_INITIAL_DATA)

  useEffect(() => {
    const sub = featuresStore.observable.subscribe(setData)
    return () => sub.unsubscribe()
  }, [])

  const getFeatureVariant = useCallback(
    <P extends FeatureFlag>(feature: P) => data.variants[feature] as FeatureVariants[P],
    [data.variants]
  )

  const isFeatureEnabled = useCallback(
    (feature: FeatureFlag) => {
      const variant = getFeatureVariant(feature)
      if (typeof variant === "string") return true
      if (typeof variant === "boolean") return variant === true
      if (typeof variant === "undefined") return false

      // force a typescript compilation error if any variant types are not handled.
      // if a developer adds a feature flag which is, for example, a number (or any other type
      // which we don't handle yet) then this compliation error will tell them that they need
      // to add an if statement above to handle that variant type.
      // without this, their new variant would always return false, and they'd be left confused
      // as to why their feature flag isn't working.
      const exhaustiveCheck: never = variant
      throw new Error(`Unhandled feature variant type ${exhaustiveCheck}`)
    },
    [getFeatureVariant]
  )

  return { isFeatureEnabled, getFeatureVariant }
}

export const [FeaturesProvider, useFeatures] = provideContext(useFeaturesProvider)

export const useFeatureFlag = <P extends FeatureFlag>(feature: P) => {
  const { isFeatureEnabled, getFeatureVariant } = useFeatures()

  const isEnabled = useMemo(() => isFeatureEnabled(feature), [feature, isFeatureEnabled])
  const variant: FeatureVariants[P] = useMemo(
    () => getFeatureVariant(feature),
    [feature, getFeatureVariant]
  )

  return { isEnabled, variant }
}

export const useIsFeatureEnabled = (feature: FeatureFlag) => {
  const { isFeatureEnabled } = useFeatures()

  return useMemo(() => isFeatureEnabled(feature), [feature, isFeatureEnabled])
}

export const useFeatureVariant = <P extends FeatureFlag>(feature: P) => {
  const { getFeatureVariant } = useFeatures()

  return useMemo(() => getFeatureVariant(feature), [feature, getFeatureVariant])
}

export const useFeatureVariantEquals = <P extends FeatureFlag>(
  feature: P,
  value: FeatureVariants[P]
) => {
  const variant = useFeatureVariant(feature)
  return variant === value
}
