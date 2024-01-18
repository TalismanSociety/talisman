import { evmNetworksActiveState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useActiveEvmNetworksState = () => {
  return useRecoilValue(evmNetworksActiveState)
}
