import { bittensorEvmSwapModule } from "./modules/bittensorEvm"
import { forevermoneySwapModule } from "./modules/forevermoney"
import type { BackgroundSwapModule } from "./types"

export const BACKGROUND_SWAP_MODULES: Record<
  "bittensor-evm" | "forevermoney",
  BackgroundSwapModule
> = {
  "bittensor-evm": bittensorEvmSwapModule,
  forevermoney: forevermoneySwapModule,
}
