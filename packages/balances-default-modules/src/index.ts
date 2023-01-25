import { EvmErc20Module } from "@talismn/balances-evm-erc20"
import { EvmNativeModule } from "@talismn/balances-evm-native"
import { SubAssetsModule } from "@talismn/balances-substrate-assets"
import { SubEquilibriumModule } from "@talismn/balances-substrate-equilibrium"
import { SubNativeModule } from "@talismn/balances-substrate-native"
import { SubOrmlModule } from "@talismn/balances-substrate-orml"
import { SubTokensModule } from "@talismn/balances-substrate-tokens"

export const balanceModules = [
  EvmErc20Module,
  EvmNativeModule,
  SubAssetsModule,
  SubEquilibriumModule,
  SubNativeModule,
  SubOrmlModule,
  SubTokensModule,
]
