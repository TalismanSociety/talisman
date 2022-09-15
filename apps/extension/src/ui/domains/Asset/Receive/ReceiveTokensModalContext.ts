import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"

const useReceiveTokensProvider = () => {
  return useOpenClose()
}

export const [ReceiveTokensModalProvider, useReceiveTokensModal] =
  provideContext(useReceiveTokensProvider)
