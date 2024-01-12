import { isLoggedInState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useIsLoggedIn = () => useRecoilValue(isLoggedInState)
