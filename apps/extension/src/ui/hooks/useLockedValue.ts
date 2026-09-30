import { useEffect, useState } from "react"

export const useLockedValue = <T>(value: T, isLocked: boolean) => {
  const [lockedValue, setLockedValue] = useState(value)

  useEffect(() => {
    if (!isLocked) setLockedValue(value)
  }, [isLocked, value])

  return isLocked ? lockedValue : value
}
