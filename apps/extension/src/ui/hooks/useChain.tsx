import type { ChainId } from "@core/domains/chains/types"
import { chainQuery } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useChain = (id: ChainId | undefined | null) => useRecoilValue(chainQuery(id))

export default useChain
