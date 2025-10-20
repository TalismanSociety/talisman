import { EvmErc20BalanceModule } from "./evm-erc20"
import { EvmNativeBalanceModule } from "./evm-native"
import { EvmUniswapV2BalanceModule } from "./evm-uniswapv2"
import { SolNativeBalanceModule } from "./sol-native"
import { SolSplBalanceModule } from "./sol-spl"
import { SubAssetsBalanceModule } from "./substrate-assets"
import { SubDTaoBalanceModule } from "./substrate-dtao"
import { SubForeignAssetsBalanceModule } from "./substrate-foreignassets"
import { SubHydrationBalanceModule } from "./substrate-hydration"
import { SubNativeBalanceModule } from "./substrate-native"
import { SubPsp22BalanceModule } from "./substrate-psp22"
import { SubTokensBalanceModule } from "./substrate-tokens"

export const BALANCE_MODULES = [
  SubNativeBalanceModule,
  SubAssetsBalanceModule,
  SubDTaoBalanceModule,
  SubHydrationBalanceModule,
  SubForeignAssetsBalanceModule,
  SubPsp22BalanceModule,
  SubTokensBalanceModule,
  EvmErc20BalanceModule,
  EvmUniswapV2BalanceModule,
  EvmNativeBalanceModule,
  SolNativeBalanceModule,
  SolSplBalanceModule,
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
export * from "./substrate-dtao"

export * from "./sol-native"
export * from "./sol-spl"

export * from "./abis"

export * from "../types/IBalanceModule"
