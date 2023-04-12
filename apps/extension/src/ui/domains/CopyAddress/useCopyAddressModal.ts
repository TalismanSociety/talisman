import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useState } from "react"

import { CopyAddressWizardInputs } from "./types"

const useCopyAddressModalProvider = () => {
  const { open: innerOpen, close, isOpen } = useOpenClose()
  const [inputs, setInputs] = useState<CopyAddressWizardInputs>()

  const open = useCallback(
    (opts: CopyAddressWizardInputs | undefined) => {
      setInputs(opts)
      innerOpen()
    },
    [innerOpen]
  )

  return {
    isOpen,
    open,
    close,
    inputs,
  }
}

export const [CopyAddressModalProvider, useCopyAddressModal] = provideContext(
  useCopyAddressModalProvider
)
