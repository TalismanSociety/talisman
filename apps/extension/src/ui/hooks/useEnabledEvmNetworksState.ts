import { evmNetworksEnabledState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useEnabledEvmNetworksState = () => {
  return useRecoilValue(evmNetworksEnabledState)
}