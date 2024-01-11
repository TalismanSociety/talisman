import { useRecoilOpenClose } from "@talisman/hooks/useOpenClose"
import { atom } from "recoil"

const isNavOpenState = atom<boolean>({
  key: "isNavOpenState",
  default: false,
})

export const usePopupNavOpenClose = () => useRecoilOpenClose(isNavOpenState)
