import { renderHook } from "@testing-library/react"
import { useSwapTxInfo } from "../../hooks/useSwapConfirmation"
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
export const confirmSwap = async ({
  module,
  quote,
  fromTokenId,
  toTokenId,
  fromAddress,
  toAddress,
  fromAmount,
  context,
}: ConfirmSwapParams) => {
  const exchange = await module.createExchange({
    fromTokenId,
    toTokenId,
    fromAmount,
    fromAddress,
    toAddress,
  })

  if (exchange?.outputAmountBN !== undefined && exchange.outputAmountBN < quote.outputAmountBN)
    throw new Error("Please select the quote again")

  let freshQuote: BaseQuote | null = null
  if (!exchange && module.supportsSlippageSetting) {
    const freshQuotes = await module.getQuote(
      {
        fromTokenId,
        toTokenId,
        fromAmount,
        fromAddress,
        toAddress,
        selectedSubProtocol: quote.subProtocol,
      },
      new AbortController().signal
    )
    const quotesArray = freshQuotes
      ? Array.isArray(freshQuotes)
        ? freshQuotes
        : [freshQuotes]
      : []
    freshQuote =
      quotesArray.find(
        (q) =>
          q.protocol === quote.protocol && (!q.subProtocol || q.subProtocol === quote.subProtocol)
      ) ??
      quotesArray[0] ??
      null
  }

  const transaction = await module.getTransaction({
    fromTokenId,
    fromAddress,
    fromAmount,
    exchange: exchange?.data ?? freshQuote ?? quote,
    context,
    toAddress,
  })

  const fees = exchange?.fees ?? freshQuote?.fees ?? quote.fees

  const { result } = renderHook(() =>
    useSwapTxInfo({
      exchange: exchange ?? undefined,
      fromTokenId,
      toTokenId,
      fromAmount,
      toAmount: quote.outputAmountBN,
      toAddress,
      protocol: module.protocol,
      subProtocol: quote.subProtocol,
    })
  )

  return { transaction, fees, txInfo: result.current }
}
