import { provideContext } from "@ui/util/provideContext"

import type { SwapInit } from "./hooks/useSwapTokensModal"

type SwapProviderProps = {
  stateInit: SwapInit | null
}

const useSwapProviderContext = ({ stateInit }: SwapProviderProps) => {
  return { stateInit }
}

export const [SwapProvider, useSwap] = provideContext(useSwapProviderContext)
