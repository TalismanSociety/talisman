import { EvmErc20BalanceModule } from "./modules/evm-erc20/index"
import { EvmNativeBalanceModule } from "./modules/evm-native"
import { EvmUniswapV2BalanceModule } from "./modules/evm-uniswapv2"
import { SubAssetsBalanceModule } from "./modules/substrate-assets"
import { SubForeignAssetsBalanceModule } from "./modules/substrate-foreignassets"
import { SubHydrationBalanceModule } from "./modules/substrate-hydration"
import { SubNativeBalanceModule } from "./modules/substrate-native"
import { SubPsp22BalanceModule } from "./modules/substrate-psp22"

export const NEW_BALANCE_MODULES = [
  SubNativeBalanceModule,
  SubAssetsBalanceModule,
  SubHydrationBalanceModule,
  SubForeignAssetsBalanceModule,
  SubPsp22BalanceModule,
  EvmErc20BalanceModule,
  EvmUniswapV2BalanceModule,
  EvmNativeBalanceModule,
]
