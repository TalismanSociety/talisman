import { EvmErc20Module } from "@talismn/balances-evm-erc20"
import { EvmNativeModule } from "@talismn/balances-evm-native"
import { SubAssetsModule } from "@talismn/balances-substrate-assets"
import { SubNativeModule } from "@talismn/balances-substrate-native"
import { SubOrmlModule } from "@talismn/balances-substrate-orml"

export const balanceModules = [
  SubNativeModule,
  SubOrmlModule,
  SubAssetsModule,
  EvmNativeModule,
  EvmErc20Module,
]
