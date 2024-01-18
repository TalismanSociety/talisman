import { isOnboardedState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useIsOnboarded = () => useRecoilValue(isOnboardedState)
