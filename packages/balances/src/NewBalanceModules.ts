import { EvmErc20BalanceModule } from "./modules/evm-erc20/index"
import { EvmNativeBalanceModule } from "./modules/evm-native"
import { EvmUniswapV2BalanceModule } from "./modules/evm-uniswapv2"
import { SubAssetsBalanceModule } from "./modules/substrate-assets"
import { SubHydrationBalanceModule } from "./modules/substrate-hydration"

export const NEW_BALANCE_MODULES = [
  SubAssetsBalanceModule,
  SubHydrationBalanceModule,
  EvmErc20BalanceModule,
  EvmUniswapV2BalanceModule,
  EvmNativeBalanceModule,
]
