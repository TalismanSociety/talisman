// Inspired from https://github.com/tobiaslins/avatar

import { FC, useMemo } from "react"
import Color from "color"
import md5 from "blueimp-md5"
import { nanoid } from "nanoid"

const djb2 = (str: string) => {
  let hash = 5381
  for (let i = 0; i < str.length; i++) hash = (hash << 5) + hash + str.charCodeAt(i)
  return hash
}

const valueFromHash = (hash: string, max: number) => {
  const value = djb2(hash) % max
  return value < 0 ? value + max : value
}

const rotateText = (text: string, nbChars = 0) => text.slice(nbChars) + text.slice(0, nbChars)

const svgStyle = { borderRadius: "50%" }

type SeedGradientProps = { seed: string; width?: number; height?: number; className?: string }

export const SeedGradient: FC<SeedGradientProps> = ({
  seed = "",
  width = 128,
  height = 128,
  className,
}) => {
  const { id, firstColor, secondColor, transform, thirdColor, cx, cy, r } = useMemo(() => {
    const hash1 = md5(seed)
    const hash2 = rotateText(hash1, 1)

    const bgHue1 = valueFromHash(hash1, 360)
    const bgColor1 = Color.hsv(bgHue1, 100, 100)

    const bgHue2 = (bgHue1 + 90) % 360
    const bgColor2 = Color.hsv(bgHue2, 100, 100)

    // BETWEEN BOUNDS
    const dotHue = (bgHue1 + valueFromHash(hash1, 90)) % 360
    const dotColor = Color.hsv(dotHue, 100, 100)

    const dotRadius = valueFromHash(hash1, 20) + 20
    const dotX = 5 + valueFromHash(hash1, 15)
    const dotY = 5 + valueFromHash(hash2, 15)
    const rotation = valueFromHash(hash2, 360)

    return {
      id: nanoid(),
      firstColor: bgColor1.hex(),
      secondColor: bgColor2.hex(),
      thirdColor: dotColor.hex(),
      transform: `rotate(${rotation} 32 32)`,
      cx: dotX,
      cy: dotY,
      r: dotRadius,
    }
  }, [seed])

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 64 64`}
      className={className}
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      style={svgStyle}
    >
      <defs>
        <linearGradient id={`${id}-bg`}>
          <stop offset="20%" stopColor={firstColor} />
          <stop offset="100%" stopColor={secondColor} />
        </linearGradient>
        <radialGradient id={`${id}-circle`}>
          <stop offset="10%" stopColor={thirdColor} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <g transform={transform}>
        <rect fill={`url(#${id}-bg)`} x="0" y="0" width={64} height={64} />
        <circle fill={`url(#${id}-circle)`} cx={cx} cy={cy} r={40} opacity={0.7} />
      </g>
    </svg>
  )
}
