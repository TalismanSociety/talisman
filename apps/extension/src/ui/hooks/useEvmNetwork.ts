import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { evmNetworkQuery } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useEvmNetwork = (
  id: EvmNetworkId | undefined | null
): EvmNetwork | CustomEvmNetwork | undefined => useRecoilValue(evmNetworkQuery(id))
