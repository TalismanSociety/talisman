import { useCallback, useState } from "react"

export const useOpenClose = (defaultOpen = false) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return { isOpen, setIsOpen, open, close, toggle }
}
