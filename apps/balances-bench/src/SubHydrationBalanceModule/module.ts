import { IBalanceModule } from "../IBalanceModule"
import { fetchBalances } from "./fetchBalances"
import { fetchTokens } from "./fetchTokens"
import { getMiniMetadata } from "./getMiniMetadata"
import { getTransferCallData } from "./getTransferCallData"
import { subscribeBalances } from "./subscribeBalances"
import { SubHydrationTokenConfig } from "./types"

export const SubHydrationBalanceModule: IBalanceModule<
  "substrate-hydration",
  SubHydrationTokenConfig
> = {
  type: "substrate-hydration",
  platform: "polkadot",
  getMiniMetadata,
  fetchTokens,
  fetchBalances,
  subscribeBalances,
  getTransferCallData,
}
