import { tokensActiveAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useActiveTokensState = () => useAtomValue(tokensActiveAtom)
