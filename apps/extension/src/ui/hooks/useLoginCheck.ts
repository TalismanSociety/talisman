import { useIsLoggedIn, useIsOnboarded } from "@ui/state"

export const useLoginCheck = () => {
  const isLoggedIn = useIsLoggedIn()
  const isOnboarded = useIsOnboarded()
  return { isLoggedIn, isOnboarded }
}
