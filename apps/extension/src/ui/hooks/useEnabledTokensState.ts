import { tokensEnabledState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useEnabledTokensState = () => {
  return useRecoilValue(tokensEnabledState)
}
