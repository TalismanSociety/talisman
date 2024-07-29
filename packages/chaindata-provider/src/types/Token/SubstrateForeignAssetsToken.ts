import { ChainId } from "../Chain"
import { NewTokenType } from "./types"

type ModuleType = "substrate-foreignassets"

export type SubForeignAssetsToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    onChainId: string
    isFrozen: boolean
    chain: { id: ChainId }
  }
>
