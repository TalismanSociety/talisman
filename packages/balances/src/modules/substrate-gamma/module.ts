import type { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE, PLATFORM, type SubGammaTokenConfig } from "./config"
import { fetchBalances } from "./fetchBalances"
import { fetchTokens } from "./fetchTokens"
import { getMiniMetadata } from "./getMiniMetadata"
import { subscribeBalances } from "./subscribeBalances"

export const SubGammaBalanceModule: IBalanceModule<typeof MODULE_TYPE, SubGammaTokenConfig> = {
  type: MODULE_TYPE,
  platform: PLATFORM,
  getMiniMetadata,
  fetchTokens,
  fetchBalances,
  subscribeBalances,
  getTransferCallData: () => {
    throw new Error("Gamma credits cannot be transferred")
  },
}
