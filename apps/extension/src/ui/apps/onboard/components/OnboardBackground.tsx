import { CSSProperties, memo, useMemo } from "react"
import { MYSTICAL_PHYSICS_V3, MysticalBackground, MysticalPhysicsV3 } from "talisman-ui"

import { useOnboard } from "../context"

const BG_CONFIG: MysticalPhysicsV3 = {
  ...MYSTICAL_PHYSICS_V3,
  artifacts: 4,
  radiusMax: 1.4,
}

// Memoize so animations don't reset on every render
const Background = memo(() => (
  <MysticalBackground className="fixed left-0 top-0 z-0 h-lvh w-lvw" config={BG_CONFIG} />
))
Background.displayName = "Background"

export const OnboardBackground = () => {
  const { stage } = useOnboard()
  const style: CSSProperties = useMemo(() => ({ opacity: 1 - stage * 0.2 }), [stage])

  return (
    // hide on mobile to prevent glitches
    <div className="hidden transition-opacity duration-[2.5s] ease-in-out sm:block" style={style}>
      <Background />
    </div>
  )
}
