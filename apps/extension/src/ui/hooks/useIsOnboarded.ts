import { useAppState } from "./useAppState"

export const useIsOnboarded = () => {
  const { onboarded } = useAppState()

  return onboarded ?? "UNKNOWN"
}
