import {
  FEATURE_STORE_INITIAL_DATA,
  FeaturesStoreData,
  featuresStore,
} from "@core/domains/app/store.features"
import { FeatureFlag } from "@core/domains/app/types"
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

  return { isFeatureEnabled }
}

export const [FeaturesProvider, useFeatures] = provideContext(useFeaturesProvider)

export const useIsFeatureEnabled = (feature: FeatureFlag) => {
  const { isFeatureEnabled } = useFeatures()

  return useMemo(() => isFeatureEnabled(feature), [feature, isFeatureEnabled])
}
