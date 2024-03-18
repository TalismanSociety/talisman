import { classNames } from "@talismn/util"
import { forwardRef, useMemo } from "react"
import { UseScrambleProps, useScramble } from "use-scramble"

// each font supports a different set of characters
const CHARACTER_SET = "ABDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const RANGE = CHARACTER_SET.map((s) => s.charCodeAt(0)) as UseScrambleProps["range"]

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

export const AlienRunes = forwardRef<
  HTMLSpanElement,
  { length: number; className?: string; scramble?: boolean }
>(({ length, scramble, className }, ref) => {
  const text = useMemo(() => getRandomText(getRunesLength(length)), [length])

  const { ref: refScramble } = useScramble({
    text,
    playOnMount: !!scramble,
    range: RANGE,
    overflow: true,
    speed: 0.5,
    scramble: 5,
  })

  return (
    <span ref={ref} className={classNames(className, "font-alienRunes animate-alienRunes")}>
      <span ref={refScramble} />
    </span>
  )
})
AlienRunes.displayName = "AlienRunes"
