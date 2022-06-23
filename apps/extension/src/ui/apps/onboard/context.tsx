import { provideContext } from "@talisman/util/provideContext"
import useAppOnboard from "@ui/hooks/useAppOnboard"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { FC, ReactNode } from "react"

const [AppOnboardProvider, useAppOnboardContext] = provideContext(useAppOnboard)

export const useOnboard = useAppOnboardContext

const Provider = ({ children }: { children?: ReactNode }) => {
  const isOnboarded = useIsOnboarded()

  // Wait until we know if user has already onboarded
  if (isOnboarded === "UNKNOWN") return null

  return <AppOnboardProvider>{children}</AppOnboardProvider>
}

export default Provider
