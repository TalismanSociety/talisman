import { ChainId } from "../Chain"
import { NewTokenType } from "./types"

type ModuleType = "substrate-assets"

export type SubAssetsToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    assetId: string
    isFrozen: boolean
    chain: { id: ChainId }
  }
>
