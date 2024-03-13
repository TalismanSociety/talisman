import { isOnboardedAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useIsOnboarded = () => useAtomValue(isOnboardedAtom)
