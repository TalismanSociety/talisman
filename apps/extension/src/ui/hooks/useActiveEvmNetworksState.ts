import { evmNetworksActiveAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useActiveEvmNetworksState = () => useAtomValue(evmNetworksActiveAtom)
