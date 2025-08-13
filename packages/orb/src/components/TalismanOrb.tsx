import { FC } from "react"

import { TalismanOrbLogo } from "./TalismanOrbLogo"
import { TalismanOrbProps } from "./types"
import { useTalismanOrb } from "./useTalismanOrb"

export const TalismanOrb: FC<TalismanOrbProps> = ({
  seed,
  width = "1em",
  height = "1em",
  className,
}) => {
  const { id, bgColor1, bgColor2, transform, glowColor, cx, cy, platform } = useTalismanOrb(seed)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 64 64`}
      className={className}
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-bg`}>
          <stop offset="20%" stopColor={bgColor1} />
          <stop offset="100%" stopColor={bgColor2} />
        </linearGradient>
        <radialGradient id={`${id}-circle`}>
          <stop offset="10%" stopColor={glowColor} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <g transform={transform}>
          <rect fill={`url(#${id}-bg)`} x={0} y={0} width={64} height={64} />
          <circle fill={`url(#${id}-circle)`} cx={cx} cy={cy} r={45} opacity={0.7} />
        </g>
        <TalismanOrbLogo platform={platform} />
      </g>
    </svg>
  )
}
