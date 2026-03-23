import { cn } from "@ui/util/cn"
import { type FC, memo, useMemo } from "react"

const createRand = (seed: string) => {
  const seedArray: [number, number, number, number] = [0, 0, 0, 0]

  for (let i = 0; i < seed.length; i++) {
    const index = (i % 4) as 0 | 1 | 2 | 3
    seedArray[index] = (seedArray[index] << 5) - seedArray[index] + seed.charCodeAt(i)
  }

  return () => {
    const [first, second, third, fourth] = seedArray
    const t = first ^ (first << 11)

    seedArray[0] = second
    seedArray[1] = third
    seedArray[2] = fourth
    seedArray[3] = fourth ^ (fourth >> 19) ^ t ^ (t >> 8)

    return (seedArray[3] >>> 0) / ((1 << 31) >>> 0)
  }
}

const createColor = (rand: () => number) => {
  const h = Math.floor(rand() * 360)
  const s = rand() * 60 + 40
  const l = (rand() + rand() + rand() + rand()) * 25

  return `hsl(${h}, ${s}%, ${l}%)`
}

const createImageData = (rand: () => number, size: number) => {
  const width = size
  const height = size
  const dataWidth = Math.ceil(width / 2)
  const mirrorWidth = width - dataWidth

  const data: number[] = []

  for (let y = 0; y < height; y++) {
    let row: number[] = []

    for (let x = 0; x < dataWidth; x++) {
      row[x] = Math.floor(rand() * 2.3)
    }

    const reverse = row.slice(0, mirrorWidth).reverse()
    row = row.concat(reverse)

    for (let i = 0; i < row.length; i++) {
      data.push(row[i] ?? 0)
    }
  }

  return data
}

const VIEWBOX_SIZE = 64
const GRID_SIZE = 8

export const BlockiesIdenticon: FC<{
  address: string
  size?: number
  className?: string
}> = memo(({ address, size = "1em", className }) => {
  const blockies = useMemo(() => {
    const seed = address.toLowerCase()
    const rand = createRand(seed)
    const color = createColor(rand)
    const bgColor = createColor(rand)
    const spotColor = createColor(rand)
    const imageData = createImageData(rand, GRID_SIZE)

    return { color, bgColor, spotColor, imageData }
  }, [address])

  const { color, bgColor, spotColor, imageData } = blockies
  const scale = VIEWBOX_SIZE / GRID_SIZE

  return (
    <svg
      className={cn("rounded-full", className)}
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      role="img"
      aria-label={`account identicon for ${address.slice(0, 8)}...${address.slice(-4)}`}
    >
      <rect width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill={bgColor} />
      {imageData.map((value, index) => {
        if (value === 0) return null
        const x = (index % GRID_SIZE) * scale
        const y = Math.floor(index / GRID_SIZE) * scale
        const fill = value === 1 ? color : spotColor
        return <rect key={`${x}-${y}`} x={x} y={y} width={scale} height={scale} fill={fill} />
      })}
    </svg>
  )
})
