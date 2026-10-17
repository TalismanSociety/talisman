import { bittensorEvmSwapModule } from "./modules/bittensorEvm"
import { forevermoneySwapModule } from "./modules/forevermoney"
import type { BackgroundSwapModule, SupportedSwapProtocol } from "./types"

export const BACKGROUND_SWAP_MODULES: Record<
  "bittensor-evm" | "forevermoney",
  BackgroundSwapModule
> = {
  "bittensor-evm": bittensorEvmSwapModule,
  forevermoney: forevermoneySwapModule,
}

export const getBackgroundSwapModule = (protocol: SupportedSwapProtocol): BackgroundSwapModule => {
  const module = (
    BACKGROUND_SWAP_MODULES as Partial<Record<SupportedSwapProtocol, BackgroundSwapModule>>
  )[protocol]
  if (!module) throw new Error(`${protocol} does not run in the background`)
  return module
}
