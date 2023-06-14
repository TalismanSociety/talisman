import { useOpenCloseGlobal } from "@talisman/hooks/useOpenClose"
import { useCallback } from "react"
import { atom, useRecoilState } from "recoil"

import { CopyAddressWizardInputs } from "./types"

const copyAddressModalState = atom<CopyAddressWizardInputs | null>({
  key: "copyAddressModalState",
  default: null,
})

export const useCopyAddressModal = () => {
  const { open: innerOpen, close, isOpen } = useOpenCloseGlobal("COPY_ADDRESS_MODAL")
  const [inputs, setInputs] = useRecoilState(copyAddressModalState)

  const open = useCallback(
    (opts: CopyAddressWizardInputs | null) => {
      setInputs(opts)
      innerOpen()
    },
    [innerOpen, setInputs]
  )

  return {
    isOpen,
    open,
    close,
    inputs,
  }
}
