import { useMemo } from "react"
import { MYSTICAL_PHYSICS_V3, MysticalBackground, MysticalPhysicsV3 } from "talisman-ui"

const BG_CONFIG: MysticalPhysicsV3 = {
  ...MYSTICAL_PHYSICS_V3,
  artifacts: 4,
  radiusMax: 0.7,
  ellipsisRatio: 0.4,
}

export type LoginBackgroundProps = {
  className?: string
  colors: [string, string]
}
export const LoginBackground = ({ className, colors }: LoginBackgroundProps) => {
  const config = useMemo(() => ({ ...BG_CONFIG, colors }), [colors])

  return <MysticalBackground className={className} config={config} />
}
