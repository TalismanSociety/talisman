import { ChainId } from "../Chain"
import { NewTokenType } from "./types"

type ModuleType = "substrate-psp22"

export type SubPsp22Token = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    contractAddress: string
    chain: { id: ChainId }
  }
>
