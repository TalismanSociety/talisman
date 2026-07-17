import { useEffect } from "react"

import { useDebouncedState } from "./useDebouncedState"

/** Returns a copy of `value` that only updates `delay` ms after `value` stops changing. */
export const useDebouncedValue = <T>(value: T, delay = 200) => {
  const [debounced, setDebounced] = useDebouncedState(value, delay)

  useEffect(() => {
    setDebounced(value)
  }, [value, setDebounced])

  return debounced
}
