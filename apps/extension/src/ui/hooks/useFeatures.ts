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

  const isFeatureEnabled = useCallback(
    (feature: FeatureFlag) => data.features.includes(feature),
    [data.features]
  )

  const getFeatureVariant = useCallback(
    <P extends FeatureFlag>(feature: P) => data.variants[feature] as FeatureVariants[P],
    [data.variants]
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
