import { isLoggedInAtom, isOnboardedAtom } from "@ui/atoms"
import { atom, useAtomValue } from "jotai"

// load both isLoggedIn and isOnboarded atoms concurrently
const loginCheckAtom = atom((get) => Promise.all([get(isLoggedInAtom), get(isOnboardedAtom)]))

export const useLoginCheck = () => {
  const [isLoggedIn, isOnboarded] = useAtomValue(loginCheckAtom)
  return { isLoggedIn, isOnboarded }
}
