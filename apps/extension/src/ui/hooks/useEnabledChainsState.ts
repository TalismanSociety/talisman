import { chainsEnabledState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useEnabledChainsState = () => {
  return useRecoilValue(chainsEnabledState)
}
