import { EvmNativeBalanceModule } from "./evm-native"
import { SolNativeBalanceModule } from "./sol-native"
import { SubNativeBalanceModule } from "./substrate-native"

export const BALANCE_MODULES = [
  SubNativeBalanceModule,
  // SubAssetsBalanceModule,
  // SubDTaoBalanceModule,
  // SubHydrationBalanceModule,
  // SubForeignAssetsBalanceModule,
  // SubPsp22BalanceModule,
  // SubTokensBalanceModule,
  // EvmErc20BalanceModule,
  // EvmUniswapV2BalanceModule,
  EvmNativeBalanceModule,
  SolNativeBalanceModule,
  // SolSplBalanceModule,
]

export type AnyBalanceModule = (typeof BALANCE_MODULES)[number] // TODO yeet ? should use IBalance

export * from "./evm-native"
export * from "./evm-erc20"
export * from "./evm-uniswapv2"

export * from "./substrate-native"
export * from "./substrate-assets"
export * from "./substrate-foreignassets"
export * from "./substrate-hydration"
// export * from "./substrate-psp22"
export * from "./substrate-tokens"
export * from "./substrate-dtao"

export * from "./sol-native"
export * from "./sol-spl"

export * from "./abis"

export * from "../types/IBalanceModule"
