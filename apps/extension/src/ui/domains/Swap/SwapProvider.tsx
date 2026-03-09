import { provideContext } from "@ui/util/provideContext"
import { useSwapContextProvider } from "./SwapProvider.internal"

export type { SwapView } from "./swap-modules/common.swap-module"

// useSwapProviderContext is located in another module for better DX in dev mode, to prevent wizard from resetting on every code change
export const [SwapProvider, useSwap] = provideContext(useSwapContextProvider)
