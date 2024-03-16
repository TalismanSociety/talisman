import { classNames } from "@talismn/util"
import { FC, Suspense, forwardRef, useEffect, useMemo, useRef } from "react"
import { useIntersection } from "react-use"

// each font supports a different set of characters
const CHARACTER_SET = "ABDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const MAX_SWAP_DELAY = 30_000

const getRandomInt = (max: number) => {
  return Math.floor(Math.random() * max)
}

// randomly adds or substracts 1, to prevent all text from being the same length which looks akward
const getRunesLength = (baseLength: number) => {
  const val = Math.random()
  if (val > 0.7) return baseLength + 1
  if (val < 0.3) return baseLength - 1
  return baseLength
}

const AlienRune: FC<{ scramble?: boolean }> = ({ scramble }) => {
  // have all runes watcht he same atom, minimizes the number of re-renders
  const refCharCode = useRef<number>(getRandomInt(CHARACTER_SET.length))
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null

    const swapCharacter = () => {
      if (!ref.current) return

      const prevCharCode = refCharCode.current
      refCharCode.current = getRandomInt(CHARACTER_SET.length)
      const spanPrev = ref.current.children[0].children[0] as HTMLSpanElement
      const spanNext = ref.current.children[1].children[0] as HTMLSpanElement
      spanPrev.classList.remove("animate-alienRunes-out")
      spanNext.classList.remove("animate-alienRunes-in")
      // add in a separate tick to trigger the animation
      setTimeout(() => {
        spanPrev.classList.add("animate-alienRunes-out")
        spanNext.classList.add("animate-alienRunes-in")
        spanPrev.innerText = CHARACTER_SET[prevCharCode]
        spanNext.innerText = CHARACTER_SET[refCharCode.current]
      }, 10)
      timeout = setTimeout(swapCharacter, 20 + getRandomInt(MAX_SWAP_DELAY))
    }

    timeout = setTimeout(swapCharacter, getRandomInt(MAX_SWAP_DELAY))

    return () => {
      if (timeout) clearTimeout(timeout)
    }

    // const sub = ticker.subscribe(() => {
    //   if (!ref.current) return

    //   // do this only 10% of the time
    //   if (Math.random() < 0.9) return

    //   const prevCharCode = refCharCode.current
    //   refCharCode.current = getRandomInt(CHARACTER_SET.length)

    //   const spanPrev = ref.current.children[0].children[0] as HTMLSpanElement
    //   const spanNext = ref.current.children[1].children[0] as HTMLSpanElement

    //   spanPrev.classList.remove("animate-alienRunes-out")
    //   spanNext.classList.remove("animate-alienRunes-in")

    //   // add in a separate tick to trigger the animation
    //   setTimeout(() => {
    //     spanPrev.classList.add("animate-alienRunes-out")
    //     spanNext.classList.add("animate-alienRunes-in")

    //     spanPrev.innerText = CHARACTER_SET[prevCharCode]
    //     spanNext.innerText = CHARACTER_SET[refCharCode.current]
    //   }, 10)
    // })

    // return () => {
    //   sub.unsubscribe()
    // }
  }, [])

  useEffect(() => {
    if (!ref.current || !scramble) return

    const spanNext = ref.current.children[1].children[0] as HTMLSpanElement

    let scrambles = 5
    const interval = setInterval(() => {
      refCharCode.current = getRandomInt(CHARACTER_SET.length)
      spanNext.innerText = CHARACTER_SET[refCharCode.current]
      scrambles--

      if (!scrambles) clearInterval(interval)
    }, 25 + getRandomInt(50))

    return () => {
      clearInterval(interval)
    }

    // don't want to re-run this effect when scramble changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <span ref={ref}>
      <span>
        <span className="opacity-0"></span>
      </span>
      <span>
        <span>{CHARACTER_SET[refCharCode.current]}</span>
      </span>
    </span>
  )
}

export const AlienRunes = forwardRef<
  HTMLSpanElement,
  { length: number; className?: string; scramble?: boolean }
>(({ length, scramble, className }, ref) => {
  const characters = useMemo(() => Array.from({ length: getRunesLength(length) }), [length])

  const refInner = useRef<HTMLSpanElement>(null)
  const intersection = useIntersection(refInner, { root: null, rootMargin: "200px" })
  const refScramble = useRef(scramble)

  useEffect(() => {
    // consider first render to be done once intersection has a value
    // after that first render, we don't want scramble to happen
    if (intersection) refScramble.current = false
  }, [intersection])

  return (
    <Suspense>
      <span
        ref={ref}
        className={classNames(className, "alienRunes font-alienRunes animate-alienRunes")}
      >
        <span ref={refInner}>
          {intersection?.isIntersecting &&
            characters.map((_, idx) => <AlienRune key={idx} scramble={refScramble.current} />)}
        </span>
      </span>
    </Suspense>
  )
})
AlienRunes.displayName = "AlienRunes"
