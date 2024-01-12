import { isLoggedInState, isOnboardedState } from "@ui/atoms"
import { useRecoilValue, waitForAll } from "recoil"

export const useLoginCheck = () => {
  const [isLoggedIn, isOnboarded] = useRecoilValue(waitForAll([isLoggedInState, isOnboardedState]))
  return { isLoggedIn, isOnboarded }
}
