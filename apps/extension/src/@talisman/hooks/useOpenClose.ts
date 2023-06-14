import { useCallback, useState } from "react"
import { atomFamily, useRecoilState } from "recoil"

type OpenCloseKey =
  | "ACCOUNT_REMOVE_MODAL"
  | "ACCOUNT_RENAME_MODAL"
  | "ACCOUNT_EXPORT_MODAL"
  | "ACCOUNT_EXPORT_PK_MODAL"
  | "COPY_ADDRESS_MODAL"
  | "BUY_TOKENS_MODAL"

const openCloseStateFamily = atomFamily<boolean, OpenCloseKey>({
  key: "openCloseStateFamily",
  default: false,
})

export const useOpenCloseGlobal = (key: OpenCloseKey) => {
  const [isOpen, setIsOpen] = useRecoilState(openCloseStateFamily(key))

  const open = useCallback(() => setIsOpen(true), [setIsOpen])
  const close = useCallback(() => setIsOpen(false), [setIsOpen])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [setIsOpen])

  return { isOpen, setIsOpen, open, close, toggle }
}

export const useOpenClose = (defaultOpen = false) => {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen)

  const open = useCallback(() => setIsOpen(true), [setIsOpen])
  const close = useCallback(() => setIsOpen(false), [setIsOpen])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [setIsOpen])

  return { isOpen, setIsOpen, open, close, toggle }
}
