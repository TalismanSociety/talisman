import { EvmErc20BalanceModule } from "./modules/evm-erc20/index"
import { SubHydrationBalanceModule } from "./modules/substrate-hydration"

export const NEW_BALANCE_MODULES = [SubHydrationBalanceModule, EvmErc20BalanceModule]
