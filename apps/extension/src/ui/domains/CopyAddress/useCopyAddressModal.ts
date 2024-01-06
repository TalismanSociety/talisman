import { useOpenCloseAtom } from "@talisman/hooks/useOpenClose"
import { useCallback } from "react"
import { atom, useRecoilState } from "recoil"

import { CopyAddressWizardInputs } from "./types"

const copyAddressInputsState = atom<CopyAddressWizardInputs | null>({
  key: "copyAddressInputsState",
  default: null,
})
const copyAddressModalOpenState = atom<boolean>({
  key: "copyAddressModalOpenState",
  default: false,
})

export const useCopyAddressModal = () => {
  const { open: innerOpen, close, isOpen } = useOpenCloseAtom(copyAddressModalOpenState)
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
