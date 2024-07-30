import { EvmErc20Module } from "./EvmErc20Module"
import { EvmNativeModule } from "./EvmNativeModule"
import { EvmUniswapV2Module } from "./EvmUniswapV2Module"
import { SubAssetsModule } from "./SubstrateAssetsModule"
import { SubEquilibriumModule } from "./SubstrateEquilibriumModule"
import { SubForeignAssetsModule } from "./SubstrateForeignAssetsModule"
import { SubNativeModule } from "./SubstrateNativeModule"
import { SubPsp22Module } from "./SubstratePsp22Module"
import { SubTokensModule } from "./SubstrateTokensModule"

export const defaultBalanceModules = [
  EvmErc20Module,
  EvmNativeModule,
  EvmUniswapV2Module,
  SubAssetsModule,
  SubEquilibriumModule,
  SubForeignAssetsModule,
  SubNativeModule,
  SubPsp22Module,
  SubTokensModule,
]

export * from "./EvmErc20Module"
export * from "./EvmNativeModule"
export * from "./EvmUniswapV2Module"
export * from "./SubstrateAssetsModule"
export * from "./SubstrateEquilibriumModule"
export * from "./SubstrateForeignAssetsModule"
export * from "./SubstrateNativeModule"
export * from "./SubstratePsp22Module"
export * from "./SubstrateTokensModule"

export * from "./util"
export * from "./util/substrate-native"
export * from "./util/storage"
