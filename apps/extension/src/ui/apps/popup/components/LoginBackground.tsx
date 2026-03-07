import {
  MYSTICAL_PHYSICS_V3,
  MysticalBackgroundV3 as MysticalBackground,
  type MysticalPhysicsV3,
} from "@ui/talisman-ui/components/MysticalBackgroundV3"
import { useMemo } from "react"

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
