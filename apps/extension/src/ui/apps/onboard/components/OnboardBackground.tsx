import { useMemo } from "react"
import { MYSTICAL_PHYSICS_V3, MysticalBackground } from "talisman-ui"

import { useOnboard } from "../context"

export const OnboardBackground = () => {
  const { stage } = useOnboard()
  const onboardConfig = useMemo(() => {
    if (!stage) return MYSTICAL_PHYSICS_V3
    return {
      opacityMax: MYSTICAL_PHYSICS_V3.opacityMax - stage * 0.1,
      opacityMin: MYSTICAL_PHYSICS_V3.opacityMin - stage * 0.05,
    }
  }, [stage])

  return (
    <MysticalBackground className="fixed left-0 top-0 h-[100vh] w-[100vw]" config={onboardConfig} />
  )
}
