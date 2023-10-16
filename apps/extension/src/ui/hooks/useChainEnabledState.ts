import { chainsEnabledState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useChainEnabledState = () => {
  return useRecoilValue(chainsEnabledState)
}
