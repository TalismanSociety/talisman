import { FC } from "react"
import useAppOnboard from "@ui/hooks/useAppOnboard"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { provideContext } from "@talisman/util/provideContext"

const [AppOnboardProvider, useAppOnboardContext] = provideContext(useAppOnboard)

export const useOnboard = useAppOnboardContext

const Provider: FC = ({ children }) => {
  const isOnboarded = useIsOnboarded()

  // Wait until we know if user has already onboarded
  if (isOnboarded === "UNKNOWN") return null

  return <AppOnboardProvider>{children}</AppOnboardProvider>
}

export default Provider
