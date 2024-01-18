import { useCallback } from "react"
import { atom, selectorFamily, useRecoilState } from "recoil"

const openCloseState = atom<{ [key: string]: boolean }>({
  key: "openCloseState",
  default: {},
})

const openCloseQuery = selectorFamily<boolean, string>({
  key: "openCloseQuery",
  get:
    (key) =>
    ({ get }) =>
      get(openCloseState)[key] ?? false,
  set:
    (key) =>
    ({ set }, value) => {
      set(openCloseState, (prev) => ({ ...prev, [key]: !!value }))
    },
})

export const useGlobalOpenClose = (key: string) => {
  const [isOpen, setIsOpen] = useRecoilState(openCloseQuery(key))

  const open = useCallback(() => setIsOpen(true), [setIsOpen])
  const close = useCallback(() => setIsOpen(false), [setIsOpen])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [setIsOpen])

  return { isOpen, setIsOpen, open, close, toggle }
}
