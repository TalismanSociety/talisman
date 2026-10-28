import { bittensorEvmSwapModule } from "./modules/bittensorEvm"
import { forevermoneySwapModule } from "./modules/forevermoney"
import { lifiLegRuntime } from "./modules/lifi"
import type { BackgroundSwapModule, PlanLegRuntime, SupportedSwapProtocol } from "./types"

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

const PLAN_LEG_RUNTIMES: Partial<Record<SupportedSwapProtocol, PlanLegRuntime>> = {
  ...BACKGROUND_SWAP_MODULES,
  lifi: lifiLegRuntime,
}

export const getPlanLegRuntime = (protocol: SupportedSwapProtocol): PlanLegRuntime => {
  const runtime = PLAN_LEG_RUNTIMES[protocol]
  if (!runtime) throw new Error(`${protocol} cannot run in a swap plan`)
  return runtime
}
