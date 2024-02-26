import { isLoggedInAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useIsLoggedIn = () => useAtomValue(isLoggedInAtom)
