import { tokenRatesMapAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useTokenRatesMap = () => useAtomValue(tokenRatesMapAtom)
