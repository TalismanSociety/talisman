import { tokensActiveAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useActiveTokensState = () => {
  return useAtomValue(tokensActiveAtom)
}
