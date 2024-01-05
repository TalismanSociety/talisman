import { chainsActiveState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useActiveChainsState = () => {
  return useRecoilValue(chainsActiveState)
}
