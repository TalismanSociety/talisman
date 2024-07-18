import { EvmNetworkId } from "../EvmNetwork"
import { NewTokenType } from "./types"

type ModuleType = "evm-native"

export type EvmNativeToken = NewTokenType<
  ModuleType,
  {
    evmNetwork: { id: EvmNetworkId }
    isCustom?: true
  }
>
