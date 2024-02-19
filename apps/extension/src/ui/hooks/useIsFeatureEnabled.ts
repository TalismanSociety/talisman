import { FeatureFlag } from "@core/domains/app/types"
import { featureFlagQuery } from "@ui/atoms/remoteConfig"
import { useRecoilValue } from "recoil"

export const useIsFeatureEnabled = (feature: FeatureFlag) => {
  return useRecoilValue(featureFlagQuery(feature))
}
