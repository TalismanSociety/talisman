import { evmNetworksEnabledState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useEvmNetworkEnabledState = () => {
  return useRecoilValue(evmNetworksEnabledState)
}
