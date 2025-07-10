import { IBalanceModule } from "../../types/IBalanceModule"
import { MiniMetadataExtra, MODULE_TYPE, ModuleConfig, PLATFORM, TokenConfig } from "./config"
import { fetchBalances } from "./fetchBalances"
import { fetchTokens } from "./fetchTokens"
import { getMiniMetadata } from "./getMiniMetadata"
import { getTransferCallData } from "./getTransferCallData"
import { subscribeBalances } from "./subscribeBalances"

export const SubTokensBalanceModule: IBalanceModule<
  typeof MODULE_TYPE,
  TokenConfig,
  ModuleConfig,
  MiniMetadataExtra
> = {
  type: MODULE_TYPE,
  platform: PLATFORM,
  getMiniMetadata,
  fetchTokens,
  fetchBalances,
  subscribeBalances,
  getTransferCallData,
}
