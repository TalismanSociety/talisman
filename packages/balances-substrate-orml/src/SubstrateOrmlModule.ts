import { IBalanceStorage } from "@talismn/balances"
import { ChainId, SubChainId } from "@talismn/chaindata-provider"
import { IToken } from "@talismn/chaindata-provider/dist/types/Token"

type ModuleType = "substrate-orml"

export type SubOrmlToken = IToken & {
  type: ModuleType
  existentialDeposit: string
  stateKey: `0x${string}`
  chain: { id: ChainId }
}

declare module "@talismn/chaindata-provider/dist/types/Token" {
  export interface TokenTypes {
    SubOrmlToken: SubOrmlToken
  }
}

export type SubOrmlBalanceStorage = IBalanceStorage & {
  source: ModuleType

  multiChainId: SubChainId

  free: string
  reserved: string
  frozen: string
}

declare module "@talismn/balances/dist/types/storages" {
  export interface BalanceStorages {
    SubOrmlBalanceStorage: SubOrmlBalanceStorage
  }
}
