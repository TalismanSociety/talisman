import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { evmNetworkAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useEvmNetwork = (
  id: EvmNetworkId | undefined | null
): EvmNetwork | CustomEvmNetwork | null => useAtomValue(evmNetworkAtomFamily(id))
