import { IBalanceModule } from "../IBalanceModule"
import { MODULE_TYPE, PLATFORM } from "./config"
import { fetchBalances } from "./fetchBalances"
import { fetchTokens } from "./fetchTokens"
import { getMiniMetadata } from "./getMiniMetadata"
import { getTransferCallData } from "./getTransferCallData"
import { subscribeBalances } from "./subscribeBalances"
import { SubHydrationTokenConfig } from "./types"

export const SubHydrationBalanceModule: IBalanceModule<
  typeof MODULE_TYPE,
  SubHydrationTokenConfig
> = {
  type: MODULE_TYPE,
  platform: PLATFORM,
  getMiniMetadata,
  fetchTokens,
  fetchBalances,
  subscribeBalances,
  getTransferCallData,
}
