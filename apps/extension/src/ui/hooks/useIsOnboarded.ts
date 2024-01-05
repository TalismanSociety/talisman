import { loginState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useIsOnboarded = () => {
  const { isOnboarded } = useRecoilValue(loginState)
  return isOnboarded
}
