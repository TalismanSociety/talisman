import { useAppState } from "./useAppState"

export const useIsOnboarded = () => {
  const [onboarded] = useAppState("onboarded")

  return onboarded ?? "UNKNOWN"
}
