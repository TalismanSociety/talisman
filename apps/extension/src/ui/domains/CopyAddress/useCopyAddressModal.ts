import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { useCallback } from "react"
import { atom, useRecoilState } from "recoil"

import { CopyAddressWizardInputs } from "./types"

const copyAddressInputsState = atom<CopyAddressWizardInputs | null>({
  key: "copyAddressInputsState",
  default: null,
})

export const useCopyAddressModal = () => {
  const { open: innerOpen, close, isOpen } = useGlobalOpenClose("copyAddressModal")
  const [inputs, setInputs] = useRecoilState(copyAddressInputsState)

  const open = useCallback(
    (opts: CopyAddressWizardInputs | undefined) => {
      setInputs(opts ?? null)
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
