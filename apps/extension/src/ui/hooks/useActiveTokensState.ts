import { tokensActiveState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useActiveTokensState = () => {
  return useRecoilValue(tokensActiveState)
}
