import { useCallback, useState } from "react"

const useBoolean = (init = false) => {
  const [value, setValue] = useState<boolean>(init)
  const toggle = useCallback(() => setValue(!value), [value])
  const set = useCallback((val = false) => setValue(val), [])
  return [value, toggle, set] as const
}

export default useBoolean
