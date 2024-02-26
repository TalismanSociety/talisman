import { SetStateAction, atom, useAtom } from "jotai"
import { atomFamily } from "jotai/utils"
import { useCallback } from "react"

const openCloseAtom = atom<{ [key: string]: boolean }>({})

const openCloseAtomFamily = atomFamily((key: string) =>
  atom(
    (get) => get(openCloseAtom)[key] ?? false,
    (get, set, value: SetStateAction<boolean>) => {
      if (typeof value === "function") value = value(get(openCloseAtom)[key])
      set(openCloseAtom, (prev) => ({ ...prev, [key]: !!value }))
    }
  )
)

export const useGlobalOpenClose = (key: string) => {
  const [isOpen, setIsOpen] = useAtom(openCloseAtomFamily(key))

  const open = useCallback(() => setIsOpen(true), [setIsOpen])
  const close = useCallback(() => setIsOpen(false), [setIsOpen])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [setIsOpen])

  return { isOpen, setIsOpen, open, close, toggle }
}
