import { IBalanceModule } from "../IBalanceModule"
import { EvmNativeTokenConfig, MODULE_TYPE, PLATFORM } from "./config"
import { fetchBalances } from "./fetchBalances"
import { fetchTokens } from "./fetchTokens"
import { getMiniMetadata } from "./getMiniMetadata"
import { getTransferCallData } from "./getTransferCallData"
import { subscribeBalances } from "./subscribeBalances"

export const EvmNativeBalanceModule: IBalanceModule<typeof MODULE_TYPE, EvmNativeTokenConfig> = {
  type: MODULE_TYPE,
  platform: PLATFORM,
  getMiniMetadata,
  fetchTokens,
  fetchBalances,
  subscribeBalances,
  getTransferCallData,
}
