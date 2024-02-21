import { FeatureFlag } from "@core/domains/app/types"
import { featureFlagAtomFamily } from "@ui/atoms/remoteConfig"
import { useAtomValue } from "jotai"

export const useIsFeatureEnabled = (feature: FeatureFlag) => {
  return useAtomValue(featureFlagAtomFamily(feature))
}
