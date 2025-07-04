import { IBalanceModule } from "../IBalanceModule"
import { fetchBalances } from "./fetchBalances"
import { fetchTokens } from "./fetchTokens"
import { getMiniMetadata } from "./getMiniMetadata"
import { getTransferCallData } from "./getTransferCallData"
import { subscribeBalances } from "./subscribeBalances"
import { EvmErc20TokenConfig } from "./types"

export const EvmErc20BalanceModule: IBalanceModule<"evm-erc20", EvmErc20TokenConfig> = {
  type: "evm-erc20",
  platform: "ethereum",
  getMiniMetadata,
  fetchTokens,
  fetchBalances,
  subscribeBalances,
  getTransferCallData,
}
