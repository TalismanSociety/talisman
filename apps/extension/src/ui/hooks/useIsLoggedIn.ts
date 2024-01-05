import { loginState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useIsLoggedIn = () => {
  const { isLoggedIn } = useRecoilValue(loginState)
  return isLoggedIn
}
