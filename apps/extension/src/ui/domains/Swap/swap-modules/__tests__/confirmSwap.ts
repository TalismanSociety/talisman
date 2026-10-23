import { buildSwapTransaction } from "../../buildSwapTransaction"
import type { BaseQuote, SwapModule, SwapTransactionContext } from "../common.swap-module"

export type ConfirmSwapParams = {
  module: SwapModule
  quote: BaseQuote
  fromTokenId: string
  toTokenId: string
  fromAddress: string
  toAddress: string
  fromAmount: bigint
  context: SwapTransactionContext
  slippage?: number
}

/** What the confirm screen builds for the selected quote: the transaction to sign, the fees it shows and the tx row info */
export const confirmSwap = async ({ slippage = 0.005, ...params }: ConfirmSwapParams) => {
  const { transaction, fees, txInfo } = await buildSwapTransaction({ ...params, slippage })
  return { transaction, fees, txInfo }
}
