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
  const { id, firstColor, secondColor, transform } = useMemo(() => {
    const hash1 = md5(seed)
    const hash2 = rotateText(hash1, 1)

    const h1 = valueFromHash(hash1, 360)
    const h2 = h1 + (90 % 360)
    const color1 = Color.hsv(h1, 100, 100)
    const color2 = Color.hsv(h2, 100, 100)

    const rotation = valueFromHash(hash2, 360)

    return {
      id: nanoid(),
      firstColor: color1.hex(),
      secondColor: color2.hex(),
      transform: `rotate(${rotation} 32 32)`,
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
        <linearGradient id={id}>
          <stop offset="0%" stopColor={firstColor} />
          <stop offset="100%" stopColor={secondColor} />
        </linearGradient>
      </defs>
      <rect fill={`url(#${id})`} x="0" y="0" width={64} height={64} transform={transform} />
    </svg>
  )
}
