import { DependencyList, useEffect } from "react"

import { useDebouncedState } from "./useDebouncedState"

export const useDebouncedMemo = <T>(
  factory: () => T,
  delay = 200,
  deps: DependencyList | undefined
) => {
  const [value, setValue] = useDebouncedState<T>(() => factory(), delay)

  useEffect(() => {
    setValue(factory())
  }, [deps, factory, setValue])

  return value
}
