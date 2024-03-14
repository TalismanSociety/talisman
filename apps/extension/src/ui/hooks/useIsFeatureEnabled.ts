import { FeatureFlag } from "@extension/core"
import { remoteConfigAtom } from "@ui/atoms/remoteConfig"
import { useAtomValue } from "jotai"
import { useMemo } from "react"

export const useIsFeatureEnabled = (feature: FeatureFlag) => {
  // don't use featureFlagAtomFamily here, because it would suspense the first time each key is called
  const remoteConfig = useAtomValue(remoteConfigAtom)

  return useMemo(() => !!remoteConfig.featureFlags[feature], [feature, remoteConfig])
}
