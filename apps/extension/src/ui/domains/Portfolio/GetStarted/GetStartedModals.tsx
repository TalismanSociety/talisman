import { useAppState } from "@ui/state"

import { LearnMoreModal } from "./LearnMore"
import { TryTalismanModal } from "./TryTalisman"

export const GetStartedModals = () => {
  const [isHidden] = useAppState("hideGetStarted")

  if (isHidden) return null

  return (
    <>
      <LearnMoreModal />
      <TryTalismanModal />
    </>
  )
}
