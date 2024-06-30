import { EvmNetworkId } from "../EvmNetwork"
import { NewTokenType } from "./types"

type ModuleType = "evm-erc20"

export type EvmErc20Token = NewTokenType<
  ModuleType,
  {
    contractAddress: string
    evmNetwork: { id: EvmNetworkId } | null
    isCustom?: true
    image?: string
  }
>
export type CustomEvmErc20Token = Omit<EvmErc20Token, "isCustom"> & { isCustom: true }
