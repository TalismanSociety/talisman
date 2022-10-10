import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"

const useBuyTokensProvider = () => {
  return useOpenClose()
}

export const [BuyTokensModalProvider, useBuyTokensModal] = provideContext(useBuyTokensProvider)
