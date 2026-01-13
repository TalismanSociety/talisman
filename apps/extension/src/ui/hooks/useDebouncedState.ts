import debounce from "lodash-es/debounce"
import { useCallback, useState } from "react"

export const useDebouncedState = <S>(initialValue: S | (() => S), delay = 200) => {
  const [value, setValue] = useState(initialValue)

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  const setDebouncedValue: React.Dispatch<React.SetStateAction<S>> = useCallback(
    debounce(setValue, delay),
    [delay]
  )

  return [value, setDebouncedValue] as const
}
