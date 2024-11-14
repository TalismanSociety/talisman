import { CSSProperties, useMemo } from "react"

import { useOnboard } from "../context"

export const OnboardBackground = () => {
  const { stage } = useOnboard()
  const style: CSSProperties = useMemo(
    () => ({
      // generated using https://colorgradient.dev/gradient-generator/
      backgroundImage:
        "radial-gradient(49% 81% at 45% 47%, #fd4848 0%, #073AFF00 100%),radial-gradient(113% 91% at 17% -2%, #d5ff5c 1%, #FF000000 99%),radial-gradient(142% 91% at 83% 7%, #d5ff5c 1%, #FF000000 99%),radial-gradient(142% 91% at 111% 84%, #121212 0%, #121212 100%)",
      opacity: (1 - stage * 0.2) / 4,
    }),
    [stage],
  )

  return (
    // hide on mobile to prevent glitches
    <div
      className="fixed left-0 top-0 z-0 h-lvh w-lvw transition-opacity duration-[2.5s] ease-in-out"
      style={style}
    ></div>
  )
}
