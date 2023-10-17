import { tokensEnabledState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useTokensEnabledState = () => {
  return useRecoilValue(tokensEnabledState)
}
