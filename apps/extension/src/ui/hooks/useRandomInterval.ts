import { useEffect, useRef } from "react"

export const useRandomInterval = <T extends () => unknown>(
  callback: T,
  minDelay: number,
  maxDelay: number
) => {
  if (maxDelay < minDelay) maxDelay = minDelay

  const savedCallback = useRef<T>(callback)

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    if (!minDelay || !maxDelay) return
    let id: NodeJS.Timeout | null = null

    const tick = () => {
      savedCallback.current && savedCallback.current()
      const nextDelay = Math.floor(Math.random() * (maxDelay - minDelay) + minDelay)
      id = setTimeout(tick, nextDelay)
    }
    tick()

    return () => (id ? clearTimeout(id) : undefined)
  }, [maxDelay, minDelay])
}
