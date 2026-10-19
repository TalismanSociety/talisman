import type { SwapFormState } from "@common/analytics/funds"

export type SwapFormInputs = {
  fromTokenId: string | null
  toTokenId: string | null
  fromAmount: bigint | null
  isLoadingQuotes: boolean
  isAllQuotesSettled: boolean
  isQuoteDataCurrent: boolean
  quoteCount: number
  transferable: bigint | null
  gasBuffer: bigint
}

export const getSwapFormState = ({
  fromTokenId,
  toTokenId,
  fromAmount,
  isLoadingQuotes,
  isAllQuotesSettled,
  isQuoteDataCurrent,
  quoteCount,
  transferable,
  gasBuffer,
}: SwapFormInputs): SwapFormState => {
  if (!fromTokenId || !toTokenId) return "no_tokens"
  if (!fromAmount) return "no_amount"
  if (isLoadingQuotes || !isAllQuotesSettled || !isQuoteDataCurrent) return "quoting"
  if (quoteCount === 0) return "no_quote"
  if (transferable !== null && fromAmount + gasBuffer > transferable) return "insufficient_balance"
  return "ready"
}
