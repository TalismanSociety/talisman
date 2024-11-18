import { CSSProperties, useMemo } from "react"

import { useOnboard } from "../context"

const BASE_STYLE: CSSProperties = {
  backgroundImage:
    "radial-gradient(75% 75% at 50% 50%, #ffffff22 0%, #ffffff44 100%),radial-gradient(75% 75% at 0% 80%, #01828F 18%, #00E0AC00 100%),radial-gradient(75% 75% at 0% 30%, #FF92D9bb 0%, #00E0AC00 100%),radial-gradient(75% 75% at 10% 2%, #8C3FCB 18%, #00E0AC00 100%),radial-gradient(75% 75% at 60% 20%, #01828Fee 18%, #00E0AC00 100%),radial-gradient(75% 75% at 80% 50%, #8C3FCBFF 18%, #00E0AC00 100%),radial-gradient(75% 75% at 50% 100%, #FF92D9bb 0%, #00E0AC00 100%)",
  opacity: 0.8,
}

const getStageOpacity = (stage: number) => {
  if (stage === 0) return 0.8 // home
  if (stage === 1) return 0.55 // password
  if (stage === 2) return 0.3 // privacy
  return 0 // account creation and success
}

export const OnboardBackground = () => {
  const { stage } = useOnboard()
  const style: CSSProperties = useMemo(
    () => ({
      ...BASE_STYLE,
      // must reach opacity 0 at stage 3 (account creation UI is meant for black bg)
      opacity: Number(BASE_STYLE.opacity ?? 1) * getStageOpacity(stage),
    }),
    [stage],
  )

  return (
    <div
      className="fixed left-0 top-0 z-0 h-lvh w-lvw transition-opacity duration-[1s] ease-linear"
      style={style}
    ></div>
  )
}
