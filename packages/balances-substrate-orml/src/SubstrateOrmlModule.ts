import { NewBalanceType } from "@talismn/balances"
import { ChainId, NewTokenType, SubChainId } from "@talismn/chaindata-provider"

type ModuleType = "substrate-orml"

export type SubOrmlToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    stateKey: `0x${string}`
    chain: { id: ChainId }
  }
>

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    SubOrmlToken: SubOrmlToken
  }
}

export type SubOrmlBalance = NewBalanceType<
  ModuleType,
  {
    multiChainId: SubChainId

    // TODO: Add a field which groups all of the types of balances together.
    // Different sources can add whatever types they want to add to this list, in a type-safe way.
    // i.e. the end user of these libs will be able to access the available types of balances for each group.
    // Also, in the Balance type, ensure that trying to access a non-existent field for one balance type will just return `0`.
    free: string
    reserved: string
    frozen: string
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    SubOrmlBalance: SubOrmlBalance
  }
}
