import type { IBalanceModule } from "../../types/IBalanceModule"
import {
  type MiniMetadataExtra,
  MODULE_TYPE,
  type ModuleConfig,
  PLATFORM,
  type TokenConfig,
} from "./config"
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
