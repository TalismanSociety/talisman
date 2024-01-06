import { useCallback, useState } from "react"
import { RecoilState, useRecoilState } from "recoil"

export const useOpenCloseAtom = (atom: RecoilState<boolean>) => {
  const [isOpen, setIsOpen] = useRecoilState(atom)
  const open = useCallback(() => setIsOpen(true), [setIsOpen])
  const close = useCallback(() => setIsOpen(false), [setIsOpen])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [setIsOpen])

  return { isOpen, setIsOpen, open, close, toggle }
}

export const useOpenClose = (defaultOpen = false) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return { isOpen, setIsOpen, open, close, toggle }
}
