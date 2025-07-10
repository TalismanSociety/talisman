import { EvmErc20BalanceModule } from "./evm-erc20"
import { EvmNativeBalanceModule } from "./evm-native"
import { EvmUniswapV2BalanceModule } from "./evm-uniswapv2"
import { SubAssetsBalanceModule } from "./substrate-assets"
import { SubForeignAssetsBalanceModule } from "./substrate-foreignassets"
import { SubHydrationBalanceModule } from "./substrate-hydration"
import { SubNativeBalanceModule } from "./substrate-native"
import { SubPsp22BalanceModule } from "./substrate-psp22"
import { SubTokensBalanceModule } from "./substrate-tokens"

export const BALANCE_MODULES = [
  SubNativeBalanceModule,
  SubAssetsBalanceModule,
  SubHydrationBalanceModule,
  SubForeignAssetsBalanceModule,
  SubPsp22BalanceModule,
  SubTokensBalanceModule,
  EvmErc20BalanceModule,
  EvmUniswapV2BalanceModule,
  EvmNativeBalanceModule,
]

export type AnyBalanceModule = (typeof BALANCE_MODULES)[number] // TODO yeet ? should use IBalance

export * from "./evm-native"
export * from "./evm-erc20"
export * from "./evm-uniswapv2"

export * from "./substrate-native"
export * from "./substrate-assets"
export * from "./substrate-foreignassets"
export * from "./substrate-hydration"
export * from "./substrate-psp22"
export * from "./substrate-tokens"

// export * from "./EvmErc20Module"
// export * from "./EvmNativeModule"
// export * from "./EvmUniswapV2Module"
// export * from "./SubstrateAssetsModule"
// export * from "./SubstrateForeignAssetsModule"
// export * from "./SubstrateNativeModule"
// export * from "./SubstratePsp22Module"
// export * from "./SubstrateTokensModule"

// export * from "./util"
export * from "./abis"

export * from "../types/IBalanceModule"
