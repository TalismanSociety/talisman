import { useEffect, useState } from "react"

export const useIsCapsLockOn = () => {
  const [isCapsLockOn, setIsCapsLockOn] = useState(false)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.getModifierState("CapsLock")) {
        setIsCapsLockOn(true)
      } else {
        setIsCapsLockOn(false)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => {
      window.removeEventListener("keydown", handleKeyPress)
    }
  }, [])

  return isCapsLockOn
}
