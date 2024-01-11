import { useRecoilOpenClose } from "@talisman/hooks/useOpenClose"
import { atom } from "recoil"

const buyTokensModalOpenState = atom<boolean>({
  key: "buyTokensModalOpenState",
  default: false,
})

export const useBuyTokensModal = () => useRecoilOpenClose(buyTokensModalOpenState)
