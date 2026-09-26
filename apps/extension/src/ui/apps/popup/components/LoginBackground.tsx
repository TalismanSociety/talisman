import {
  MYSTICAL_PHYSICS,
  MysticalBackground,
  type MysticalPhysics,
} from "@ui/components/MysticalBackground"
import { useMemo } from "react"

const BG_CONFIG: MysticalPhysics = {
  ...MYSTICAL_PHYSICS,
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
