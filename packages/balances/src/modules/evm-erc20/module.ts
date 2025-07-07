import { IBalanceModule } from "../IBalanceModule"
import { EvmErc20TokenConfig, MODULE_TYPE, PLATFORM } from "./config"
import { fetchBalances } from "./fetchBalances"
import { fetchTokens } from "./fetchTokens"
import { getMiniMetadata } from "./getMiniMetadata"
import { getTransferCallData } from "./getTransferCallData"
import { subscribeBalances } from "./subscribeBalances"

export const EvmErc20BalanceModule: IBalanceModule<typeof MODULE_TYPE, EvmErc20TokenConfig> = {
  type: MODULE_TYPE,
  platform: PLATFORM,
  getMiniMetadata,
  fetchTokens,
  fetchBalances,
  subscribeBalances,
  getTransferCallData,
}
