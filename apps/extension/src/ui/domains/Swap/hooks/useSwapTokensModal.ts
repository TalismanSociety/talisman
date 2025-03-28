import { useStateObservable } from "@react-rxjs/core"
import { SetStateAction } from "react"

import { setSwapTokensModalIsOpen, swapTokensModalIsOpen$ } from "../state/swapTokensModalIsOpen"

export const useSwapTokensModal = () => ({
  isOpen: useStateObservable(swapTokensModalIsOpen$),
  open,
  close,
  toggle,
  setIsOpen,
})

const open = () => setIsOpen(true)
const close = () => setIsOpen(false)
const toggle = () => setIsOpen((v) => !v)

const setIsOpen = async (isOpen: SetStateAction<boolean>) =>
  setSwapTokensModalIsOpen(
    typeof isOpen === "function" ? isOpen(await swapTokensModalIsOpen$.getValue()) : isOpen,
  )
