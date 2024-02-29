import { chainsActiveAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useActiveChainsState = () => useAtomValue(chainsActiveAtom)
