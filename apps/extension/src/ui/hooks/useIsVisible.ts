import { useEffect, useRef, useState } from "react"

const DEFAULT_OPTIONS: IntersectionObserverInit = {
  root: null,
}

export const useIsVisible = <T extends HTMLElement>(options = DEFAULT_OPTIONS) => {
  const ref = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      options,
    )

    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [options])

  return [ref, isVisible] as const
}
