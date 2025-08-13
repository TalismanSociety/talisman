import { FC } from "react"

import { TalismanOrbProps } from "./types"
import { useTalismanOrb } from "./useTalismanOrb"

export const TalismanOrbRectangle: FC<TalismanOrbProps> = ({ width, height, seed, className }) => {
  const { id, bgColor1, bgColor2, transform, glowColor, cx, cy } = useTalismanOrb(seed)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 64 64`}
      preserveAspectRatio="none"
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
          <circle cx="32" cy="32" r="48" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <g transform={transform}>
          <rect fill={`url(#${id}-bg)`} x={-16} y={-16} width={96} height={96} />
          <circle fill={`url(#${id}-circle)`} cx={cx} cy={cy} r={45} opacity={0.7} />
        </g>
      </g>
    </svg>
  )
}
