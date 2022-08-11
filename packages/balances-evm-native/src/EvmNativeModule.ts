import { NewBalanceType } from "@talismn/balances"
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

    // TODO: Add a field which groups all of the types of balances together.
    // Different sources can add whatever types they want to add to this list, in a type-safe way.
    // i.e. the end user of these libs will be able to access the available types of balances for each group.
    // Also, in the Balance type, ensure that trying to access a non-existent field for one balance type will just return `0`.
    free: string
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    EvmNativeBalance: EvmNativeBalance
  }
}
