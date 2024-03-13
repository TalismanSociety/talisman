import { classNames } from "@talismn/util"
import { forwardRef, useMemo } from "react"

// each font supports a different set of characters
const CHARACTER_SET = "ABDEFGHIJKLMNOPQRSTUVWXYZ".split("")

const getRandomInt = (max: number) => {
  return Math.floor(Math.random() * max)
}

const getRandomText = (length: number) => {
  return Array.from({ length })
    .map(() => {
      const idx = getRandomInt(CHARACTER_SET.length)
      return CHARACTER_SET[idx]
    })
    .join("")
}

// randomly adds or substracts 1, to prevent all text from being the same length which looks akward
const getRunesLength = (baseLength: number) => {
  const val = Math.random()
  if (val > 0.7) return baseLength + 1
  if (val < 0.3) return baseLength - 1
  return baseLength
}

export const AlienRunes = forwardRef<HTMLSpanElement, { length: number; className?: string }>(
  ({ length, className }, ref) => {
    const text = useMemo(() => getRandomText(getRunesLength(length)), [length])

    return (
      <span ref={ref} className={classNames(className, "font-alienRunes animate-glow-blue")}>
        {text}
      </span>
    )
  }
)
AlienRunes.displayName = "AlienRunes"
