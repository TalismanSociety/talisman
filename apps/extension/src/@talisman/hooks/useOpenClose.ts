import { useCallback, useState } from "react"
// import { RecoilState, atom, selectorFamily, useRecoilState } from "recoil"

// const openCloseState = atom<{ [key: string]: boolean }>({
//   key: "openCloseState",
//   default: {},
// })

// const openCloseQuery = selectorFamily<boolean, string>({
//   key: "openCloseQuery",
//   get:
//     (key) =>
//     ({ get }) =>
//       get(openCloseState)[key] ?? false,
//   set:
//     (key) =>
//     ({ set }, value) => {
//       set(openCloseState, (prev) => ({ ...prev, [key]: !!value }))
//     },
// })

// export const useRecoilOpenCloseByKey = (key: string) => {
//   const [isOpen, setIsOpen] = useRecoilState(openCloseQuery(key))
//   const open = useCallback(() => setIsOpen(true), [setIsOpen])
//   const close = useCallback(() => setIsOpen(false), [setIsOpen])
//   const toggle = useCallback(() => setIsOpen((prev) => !prev), [setIsOpen])

//   return { isOpen, setIsOpen, open, close, toggle }
// }

// export const useRecoilOpenClose = (atom: RecoilState<boolean>) => {
//   const [isOpen, setIsOpen] = useRecoilState(atom)
//   const open = useCallback(() => setIsOpen(true), [setIsOpen])
//   const close = useCallback(() => setIsOpen(false), [setIsOpen])
//   const toggle = useCallback(() => setIsOpen((prev) => !prev), [setIsOpen])

//   return { isOpen, setIsOpen, open, close, toggle }
// }

export const useOpenClose = (defaultOpen = false) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return { isOpen, setIsOpen, open, close, toggle }
}
