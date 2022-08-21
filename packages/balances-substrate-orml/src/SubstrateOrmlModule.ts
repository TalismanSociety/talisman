import { Amount, BalanceModule, DefaultBalanceModule, NewBalanceType } from "@talismn/balances"
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

    free: Amount
    reserves: Amount
    locks: Amount
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    SubOrmlBalance: SubOrmlBalance
  }
}

export const SubOrmlModule: BalanceModule<ModuleType, SubOrmlToken> = {
  ...DefaultBalanceModule("substrate-orml"),
}
