import { ChainId } from "../Chain"
import { NewTokenType } from "./types"

type ModuleType = "substrate-native"

export type SubNativeToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    chain: { id: ChainId }
  }
>
export type CustomSubNativeToken = SubNativeToken & { isCustom: true }
