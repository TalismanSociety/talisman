import { useEffect, useState } from "react"

function useSensitiveState<T>(): [
  T | undefined,
  React.Dispatch<React.SetStateAction<T | undefined>>
]
function useSensitiveState<T>(initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>]
function useSensitiveState<T>(
  initialValue?: T
): [T | undefined, React.Dispatch<React.SetStateAction<T | undefined>>] {
  const [value, setValue] = useState<T | undefined>(initialValue)

  useEffect(() => {
    return () => {
      // Clear the sensitive state value on unmount
      setValue(undefined)
    }
  }, [])

  return [value, setValue]
}

export { useSensitiveState }
