import { CSSProperties, useMemo } from "react"

import { useOnboard } from "../context"

const BASE_STYLE: CSSProperties = {
  backgroundImage:
    "radial-gradient(90% 100% at 35% 20%, #BA84FF77 0%, #12121200 100%),radial-gradient(75% 100% at 90% 20%, #F48F4588 0%, #12121200 100%),radial-gradient(100% 100% at 30% 20%, #047A5C88 0%, #12121200 100%),radial-gradient(75% 75% at 50% 50%, #121212 0%, #121212 100%)",
  opacity: 0.8,
}

export const OnboardBackground = () => {
  const { stage } = useOnboard()
  const style: CSSProperties = useMemo(
    () => ({
      ...BASE_STYLE,
      opacity: Number(BASE_STYLE.opacity ?? 1) * (1 - stage * 0.2),
    }),
    [stage],
  )

  return (
    <div
      className="fixed left-0 top-0 z-0 h-lvh w-lvw transition-opacity duration-[2.5s] ease-in-out"
      style={style}
    ></div>
  )
}
