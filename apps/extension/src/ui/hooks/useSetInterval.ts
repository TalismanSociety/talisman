import { useEffect, useRef } from "react"

export const useSetInterval = <T extends () => unknown>(callback: T, delay: number) => {
  const savedCallback = useRef<T>(callback)

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    if (!delay) return
    const tick = () => {
      savedCallback.current && savedCallback.current()
    }
    tick()
    const id = setInterval(tick, delay)
    return () => clearInterval(id)
  }, [delay])
}
