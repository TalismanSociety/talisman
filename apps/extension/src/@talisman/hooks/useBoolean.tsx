import { useState, useCallback } from "react"

const useBoolean = (init: boolean = false) => {
  const [value, setValue] = useState<boolean>(init)
  const toggle = useCallback(() => setValue(!value), [value])
  const set = useCallback((val: boolean = false) => setValue(val), [])
  return [value, toggle, set] as const
}

export default useBoolean
