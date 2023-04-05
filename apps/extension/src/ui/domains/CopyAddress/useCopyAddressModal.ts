import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useState } from "react"

import { CopyAddressWizardInputs } from "./types"

const useCopyAddressModalProvider = () => {
  const { open: innerOpen, close, isOpen } = useOpenClose()
  const [options, setOptions] = useState<CopyAddressWizardInputs>()

  const open = useCallback(
    (opts: CopyAddressWizardInputs | undefined) => {
      setOptions(opts)
      innerOpen()
    },
    [innerOpen]
  )

  return {
    isOpen,
    open,
    close,
    inputs: options,
  }
}

export const [CopyAddressModalProvider, useCopyAddressModal] = provideContext(
  useCopyAddressModalProvider
)
