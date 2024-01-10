import { useOpenCloseAtom } from "@talisman/hooks/useOpenClose"
import { atom } from "recoil"

const isNavOpenState = atom<boolean>({
  key: "isNavOpenState",
  default: false,
})

export const usePopupNavOpenClose = () => useOpenCloseAtom(isNavOpenState)
