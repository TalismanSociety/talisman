import { ChainId } from "../Chain"
import { NewTokenType } from "./types"

type ModuleType = "substrate-equilibrium"

export type SubEquilibriumToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    assetId: string
    chain: { id: ChainId }
  }
>
