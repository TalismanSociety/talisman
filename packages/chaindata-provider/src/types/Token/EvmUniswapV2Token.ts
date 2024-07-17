import { EvmNetworkId } from "../EvmNetwork"
import { NewTokenType } from "./types"

type ModuleType = "evm-uniswapv2"

export type EvmUniswapV2Token = NewTokenType<
  ModuleType,
  {
    contractAddress: string
    symbol0: string
    symbol1: string
    decimals0: number
    decimals1: number
    tokenAddress0: string
    tokenAddress1: string
    coingeckoId0?: string
    coingeckoId1?: string
    evmNetwork: { id: EvmNetworkId } | null
  }
>
export type CustomEvmUniswapV2Token = Omit<EvmUniswapV2Token, "isCustom"> & {
  isCustom: true
  image?: string
}
