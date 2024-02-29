import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { atom, useAtom } from "jotai"
import { useCallback } from "react"

import { CopyAddressWizardInputs } from "./types"

const copyAddressInputsState = atom<CopyAddressWizardInputs | null>(null)

export const useCopyAddressModal = () => {
  const { open: innerOpen, close, isOpen } = useGlobalOpenClose("copyAddressModal")
  const [inputs, setInputs] = useAtom(copyAddressInputsState)

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
