import debounce from "lodash/debounce"
import { useCallback, useState } from "react"

export const useDebouncedState = <S>(initialValue: S | (() => S), delay = 200) => {
  const [value, setValue] = useState(initialValue)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setDebouncedValue: React.Dispatch<React.SetStateAction<S>> = useCallback(
    debounce(setValue, delay),
    [delay]
  )

  return [value, setDebouncedValue] as const
}
