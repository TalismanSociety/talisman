import { IBalanceStorage } from "@talismn/balances"
import { EvmChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { IToken } from "@talismn/chaindata-provider/dist/types/Token"

type ModuleType = "evm-erc20"

export type EvmErc20Token = IToken & {
  type: ModuleType
  contractAddress: string
  evmNetwork: { id: EvmNetworkId } | null
  // chain?: { id: ChainId } | null
  // evmNetwork?: { id: EvmNetworkId } | null
}
export type CustomEvmErc20Token = EvmErc20Token & {
  isCustom: true
  image?: string
}

declare module "@talismn/chaindata-provider/dist/types/Token" {
  export interface TokenTypes {
    EvmErc20Token: EvmErc20Token
    CustomEvmErc20Token: CustomEvmErc20Token
  }
}

export type EvmErc20BalanceStorage = IBalanceStorage & {
  source: ModuleType

  multiChainId: EvmChainId

  free: string
}

declare module "@talismn/balances/dist/types/storages" {
  export interface BalanceStorages {
    EvmErc20BalanceStorage: EvmErc20BalanceStorage
  }
}
