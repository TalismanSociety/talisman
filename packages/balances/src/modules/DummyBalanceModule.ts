import { TokenType } from "@talismn/chaindata-provider"

import { IBalanceModule, PlatformOf } from "./IBalanceModule"

export const getDummyBalanceModule = <T extends TokenType>(
  type: T,
  platform: PlatformOf<T>,
): IBalanceModule<T> => ({
  type,
  platform,
  getMiniMetadata: () => {
    throw new Error("Not implemented")
  },
  fetchTokens: () => {
    throw new Error("Not implemented")
  },
  fetchBalances: () => {
    throw new Error("Not implemented")
  },
  subscribeBalances: () => {
    throw new Error("Not implemented")
  },
  getTransferCallData: () => {
    throw new Error("Not implemented")
  },
})
