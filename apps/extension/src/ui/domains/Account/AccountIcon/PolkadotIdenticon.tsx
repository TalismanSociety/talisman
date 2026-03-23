import { blake2b } from "@noble/hashes/blake2.js"
import { cn } from "@ui/util/cn"
import { getSs58AddressInfo } from "polkadot-api"
import { memo, useMemo } from "react"

const S = 64
const C = S / 2
const Z = (S / 64) * 5

interface Circle {
  cx: number
  cy: number
  fill: string
  r: number
}

interface Scheme {
  colors: readonly number[]
  freq: number
}

const SCHEMES: readonly Scheme[] = [
  {
    colors: [0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 1],
    freq: 1,
  },
  {
    colors: [0, 1, 3, 2, 4, 3, 0, 1, 3, 2, 4, 3, 0, 1, 3, 2, 4, 3, 5],
    freq: 20,
  },
  {
    colors: [1, 2, 3, 1, 2, 4, 5, 5, 4, 1, 2, 3, 1, 2, 4, 5, 5, 4, 0],
    freq: 16,
  },
  {
    colors: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 3],
    freq: 32,
  },
  {
    colors: [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 6],
    freq: 32,
  },
  {
    colors: [0, 1, 2, 3, 4, 5, 3, 4, 2, 0, 1, 6, 7, 8, 9, 7, 8, 6, 10],
    freq: 128,
  },
  {
    colors: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 8, 6, 7, 5, 3, 4, 2, 11],
    freq: 128,
  },
]

const SCHEMES_TOTAL = SCHEMES.reduce((a, s) => a + s.freq, 0)

const OUTER_CIRCLE: Circle = {
  cx: C,
  cy: C,
  fill: "#eee",
  r: C,
}

let zeroHash: Uint8Array = new Uint8Array()

const getByte = (value: Uint8Array, index: number) => value[index] ?? 0

const decodeAddress = (address: string): Uint8Array => {
  const info = getSs58AddressInfo(address)
  if (!info.isValid) {
    throw new Error("Invalid SS58 address")
  }
  return info.publicKey
}

const getRotation = (
  isSixPoint: boolean
): {
  r: number
  ro2: number
  r3o4: number
  ro4: number
  rroot3o2: number
  rroot3o4: number
} => {
  const r = isSixPoint ? (C / 8) * 5 : (C / 4) * 3
  const rroot3o2 = (r * Math.sqrt(3)) / 2
  const ro2 = r / 2
  const rroot3o4 = rroot3o2 / 2
  const ro4 = r / 4
  const r3o4 = (r * 3) / 4

  return { r, r3o4, ro2, ro4, rroot3o2, rroot3o4 }
}

const getCircleXY = (isSixPoint = false): [number, number][] => {
  const { r, r3o4, ro2, ro4, rroot3o2, rroot3o4 } = getRotation(isSixPoint)

  return [
    [C, C - r],
    [C, C - ro2],
    [C - rroot3o4, C - r3o4],
    [C - rroot3o2, C - ro2],
    [C - rroot3o4, C - ro4],
    [C - rroot3o2, C],
    [C - rroot3o2, C + ro2],
    [C - rroot3o4, C + ro4],
    [C - rroot3o4, C + r3o4],
    [C, C + r],
    [C, C + ro2],
    [C + rroot3o4, C + r3o4],
    [C + rroot3o2, C + ro2],
    [C + rroot3o4, C + ro4],
    [C + rroot3o2, C],
    [C + rroot3o2, C - ro2],
    [C + rroot3o4, C - ro4],
    [C + rroot3o4, C - r3o4],
    [C, C],
  ]
}

const findScheme = (d: number): Scheme => {
  let cum = 0
  const schema = SCHEMES.find((scheme) => {
    cum += scheme.freq
    return d < cum
  })

  if (!schema) {
    throw new Error("Unable to find schema")
  }

  return schema
}

const addressToId = (address: string): Uint8Array => {
  if (!zeroHash.length) {
    zeroHash = blake2b(new Uint8Array(32), { dkLen: 64 })
  }

  const publicKey = decodeAddress(address)
  const hash = blake2b(publicKey, { dkLen: 64 })

  return hash.map((x, i) => (x + 256 - (zeroHash[i] ?? 0)) % 256)
}

const getColors = (address: string): string[] => {
  const id = addressToId(address)
  const d = Math.floor((getByte(id, 30) + getByte(id, 31) * 256) % SCHEMES_TOTAL)
  const rot = (getByte(id, 28) % 6) * 3
  const sat = (Math.floor((getByte(id, 29) * 70) / 256 + 26) % 80) + 30
  const scheme = findScheme(d)
  const palette = Array.from(id).map((x, i): string => {
    const b = (x + (i % 28) * 58) % 256

    if (b === 0) {
      return "#444"
    }
    if (b === 255) {
      return "transparent"
    }

    const h = Math.floor((b % 64) * (360 / 64))
    const l = [53, 15, 35, 75][Math.floor(b / 64)]

    return `hsl(${h}, ${sat}%, ${l}%)`
  })

  return scheme.colors.map((_, i) => {
    const index = i < 18 ? (i + rot) % 18 : 18
    const schemeColor = scheme.colors[index] ?? 0
    return palette[schemeColor] ?? "#ddd"
  })
}

const polkadotIcon = (address: string, isAlternative = false): Circle[] => {
  const xy = getCircleXY(isAlternative)
  let colors: string[]

  try {
    colors = getColors(address)
  } catch {
    colors = new Array<string>(xy.length).fill("#ddd")
  }

  return [OUTER_CIRCLE].concat(
    xy.map(
      ([cx, cy], index): Circle => ({
        cx,
        cy,
        fill: colors[index] ?? "#ddd",
        r: Z,
      })
    )
  )
}

interface PolkadotIdenticonProps {
  address: string
  size?: number
  className?: string
  isAlternative?: boolean
}

export const PolkadotIdenticon = memo(
  ({ address, className, isAlternative = false }: PolkadotIdenticonProps) => {
    const circles = useMemo(() => polkadotIcon(address, isAlternative), [address, isAlternative])

    return (
      <svg
        className={cn("rounded-full", className)}
        viewBox="0 0 64 64"
        role="img"
        aria-label={`Account identicon for ${address.slice(0, 8)}...${address.slice(-6)}`}
      >
        {circles.map(({ cx, cy, fill, r }, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: order wont change
          <circle key={i} cx={cx} cy={cy} fill={fill} r={r} />
        ))}
      </svg>
    )
  }
)
