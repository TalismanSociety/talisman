import { EvmUniswapV2TokenConfig } from "../EvmUniswapV2Module"
import { IBalanceModule } from "../IBalanceModule"
import { MODULE_TYPE, PLATFORM } from "./config"
import { fetchBalances } from "./fetchBalances"
import { fetchTokens } from "./fetchTokens"
import { getMiniMetadata } from "./getMiniMetadata"
import { getTransferCallData } from "./getTransferCallData"
import { subscribeBalances } from "./subscribeBalances"

export const EvmUniswapV2BalanceModule: IBalanceModule<
  typeof MODULE_TYPE,
  EvmUniswapV2TokenConfig
> = {
  type: MODULE_TYPE,
  platform: PLATFORM,
  getMiniMetadata,
  fetchTokens,
  fetchBalances,
  subscribeBalances,
  getTransferCallData,
}
