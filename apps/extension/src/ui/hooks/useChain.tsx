import type { ChainId } from "@core/domains/chains/types"
import { chainByIdAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useChain = (id: ChainId | undefined | null) => useAtomValue(chainByIdAtomFamily(id))

export default useChain
