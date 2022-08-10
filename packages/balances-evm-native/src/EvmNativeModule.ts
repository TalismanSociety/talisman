import { IBalanceStorage } from "@talismn/balances"
import { EvmChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { IToken } from "@talismn/chaindata-provider/dist/types/Token"

type ModuleType = "evm-native"

export type EvmNativeToken = IToken & {
  type: ModuleType
  // existentialDeposit: string
  evmNetwork: { id: EvmNetworkId } | null
  // chain?: { id: ChainId } | null
  // evmNetwork?: { id: EvmNetworkId } | null
}

declare module "@talismn/chaindata-provider/dist/types/Token" {
  export interface TokenTypes {
    EvmNativeToken: EvmNativeToken
  }
}

export type EvmNativeBalanceStorage = IBalanceStorage & {
  source: ModuleType

  multiChainId: EvmChainId

  free: string
}

declare module "@talismn/balances/dist/types/storages" {
  export interface BalanceStorages {
    EvmNativeBalanceStorage: EvmNativeBalanceStorage
  }
}
