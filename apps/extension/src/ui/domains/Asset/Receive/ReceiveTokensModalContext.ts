import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useState } from "react"

const useReceiveTokensProvider = () => {
  const [title, setTitle] = useState("Receive Funds")

  const { open: baseOpen, ...openClose } = useOpenClose()

  const open = useCallback(
    (titleText?: string) => {
      if (titleText) setTitle(titleText)
      baseOpen()
    },
    [baseOpen]
  )

  return {
    ...openClose,
    open,
    title,
  }
}

export const [ReceiveTokensModalProvider, useReceiveTokensModal] =
  provideContext(useReceiveTokensProvider)
