import { ChainId } from "../Chain"
import { NewTokenType } from "./types"

type ModuleType = "substrate-tokens"

export type SubTokensToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    onChainId: string | number
    chain: { id: ChainId }
  }
>
