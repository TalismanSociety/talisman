import { useEffect, useMemo, useRef, useState } from "react"

import { useSetting } from "./useSettings"

export const useRevealableBalance = (isBalance?: boolean, noCountUp?: boolean) => {
  // keeping noCountUp param in state because we do not want it to change to true after component is mounted
  // this prevents having performance issue when revealing all balances at once
  const [effectiveNoCountUp, setEffectiveNoCountUp] = useState(!!noCountUp)
  const [hideBalances] = useSetting("hideBalances")
  const refReveal = useRef<HTMLDivElement>(null)
  const [isRevealed, setIsRevealed] = useState(false)

  const isRevealable = useMemo(() => Boolean(isBalance && hideBalances), [hideBalances, isBalance])
  const isHidden = useMemo(() => isRevealable && !isRevealed, [isRevealable, isRevealed])

  // locks noCountUp once it set
  useEffect(() => {
    setEffectiveNoCountUp((prev) => (prev === true ? prev : isRevealable || !!noCountUp))
  }, [isRevealable, noCountUp])

  // handle revealing hidden balance
  useEffect(() => {
    const span = refReveal.current
    if (!hideBalances || !isBalance || !span) return

    const show = (e: MouseEvent) => {
      e.stopPropagation()
      setIsRevealed((prev) => !prev)
    }
    const hide = () => setIsRevealed(false)

    span.addEventListener("click", show)
    span.addEventListener("mouseleave", hide)

    return () => {
      span.removeEventListener("click", show)
      span.removeEventListener("mouseleave", hide)
    }
  }, [hideBalances, isBalance])

  return {
    refReveal,
    isRevealable,
    isRevealed: !isRevealable || isRevealed, //if not revealable, it's revealed
    isHidden,
    effectiveNoCountUp,
  }
}
