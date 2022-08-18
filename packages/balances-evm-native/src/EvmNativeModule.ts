import { Amount, NewBalanceType } from "@talismn/balances"
import { EvmChainId, EvmNetworkId, NewTokenType } from "@talismn/chaindata-provider"

type ModuleType = "evm-native"

export type EvmNativeToken = NewTokenType<
  ModuleType,
  {
    evmNetwork: { id: EvmNetworkId } | null
  }
>
export type CustomEvmNativeToken = EvmNativeToken & {
  isCustom: true
}

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    EvmNativeToken: EvmNativeToken
    CustomEvmNativeToken: CustomEvmNativeToken
  }
}

export type EvmNativeBalance = NewBalanceType<
  ModuleType,
  {
    multiChainId: EvmChainId

    free: Amount
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    EvmNativeBalance: EvmNativeBalance
  }
}
