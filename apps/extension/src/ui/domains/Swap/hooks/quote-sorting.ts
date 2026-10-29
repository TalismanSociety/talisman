import type { BaseQuote, QuoteFee, SupportedSwapProtocol } from "@core/domains/swaps/types"
import type { TokenRatesList } from "@talismn/token-rates"
import BigNumber from "bignumber.js"

export type QuoteSorting = "decentalised" | "cheapest" | "fastest" | "bestRate"

/** `netUsd` is null when the output token or a fee paid on top has no rate */
export type QuoteWithFees = { quote: BaseQuote; fees: number; netUsd: number | null }

/**
 * Flatten query results into a list of valid quotes (outputAmountBN > 0).
 */
export const flattenQuotes = (
  results: Array<BaseQuote | BaseQuote[] | null | undefined>
): BaseQuote[] => {
  const flat: BaseQuote[] = []
  for (const data of results) {
    if (!data) continue
    if (Array.isArray(data)) {
      for (const q of data) {
        if (q && q.outputAmountBN > 0n) flat.push(q)
      }
    } else {
      if (data.outputAmountBN > 0n) flat.push(data)
    }
  }
  return flat
}

/**
 * Calculate total fees in USD for a single quote.
 */
const sumUsd = (fees: QuoteFee[], tokenRates: TokenRatesList) =>
  fees.reduce(
    (acc, fee) => acc.plus(fee.amount.times(tokenRates[fee.tokenId]?.usd?.price ?? 0)),
    BigNumber(0)
  )

export const calculateQuoteFees = (quote: BaseQuote, tokenRates: TokenRatesList): number =>
  sumUsd(quote.fees, tokenRates).toNumber()

/**
 * What the quote delivers in USD, less every fee the user pays on top of the swap.
 */
const calculateNetUsd = (
  quote: BaseQuote,
  tokenRates: TokenRatesList,
  toToken: { id: string; decimals: number } | null
): number | null => {
  const rate = toToken ? tokenRates[toToken.id]?.usd?.price : undefined
  const paidOnTop = quote.fees.filter((fee) => fee.additional || fee.gas)
  if (!toToken || !rate || paidOnTop.some((fee) => !tokenRates[fee.tokenId]?.usd?.price))
    return null
  const output = BigNumber(quote.outputAmountBN.toString()).shiftedBy(-toToken.decimals).times(rate)
  return output.minus(sumUsd(paidOnTop, tokenRates)).toNumber()
}

/**
 * Attach USD fee totals and net USD values to each quote.
 */
export const attachFees = (
  quotes: BaseQuote[],
  tokenRates: TokenRatesList,
  toToken: { id: string; decimals: number } | null
): QuoteWithFees[] =>
  quotes.map((quote) => ({
    quote,
    fees: calculateQuoteFees(quote, tokenRates),
    netUsd: calculateNetUsd(quote, tokenRates, toToken),
  }))

export const toPlanck = (fee: QuoteFee, decimals: number) =>
  BigNumber(fee.amount).shiftedBy(decimals).integerValue(BigNumber.ROUND_CEIL).toFixed()

/** Sum of the additional fees charged in `tokenId`, the amount the account must hold on top of gas */
export const getAdditionalFeePlanck = (fees: QuoteFee[], tokenId: string, decimals: number) =>
  fees
    .filter((fee) => fee.additional && fee.tokenId === tokenId)
    .reduce((total, fee) => total + BigInt(toPlanck(fee, decimals)), 0n)

export type NativeHolding = { tokenId: string; decimals: number; transferable: bigint }

/**
 * Drop the quotes the account cannot pay for: the input plus the fees charged on top of it,
 * in the source network's native token, exceed what it holds.
 * When no quote fits, keep them all so the confirm screen names the shortfall.
 */
export const dropUnaffordableQuotes = (
  quotes: QuoteWithFees[],
  native: NativeHolding | null
): QuoteWithFees[] => {
  if (!native) return quotes
  const affordable = quotes.filter(({ quote }) => {
    const input = quote.legs[0].fromTokenId === native.tokenId ? quote.inputAmountBN : 0n
    const additionalFees = getAdditionalFeePlanck(quote.fees, native.tokenId, native.decimals)
    return input + additionalFees <= native.transferable
  })
  return affordable.length ? affordable : quotes
}

/**
 * Sort quotes according to the chosen sorting strategy.
 */
export const sortQuotes = (quotes: QuoteWithFees[], sorting: QuoteSorting): QuoteWithFees[] => {
  const isEveryNetValueKnown = quotes.every(({ netUsd }) => netUsd !== null)
  return [...quotes].sort((a, b) => {
    switch (sorting) {
      case "bestRate":
        return isEveryNetValueKnown
          ? (b.netUsd ?? 0) - (a.netUsd ?? 0)
          : +(b.quote.outputAmountBN - a.quote.outputAmountBN).toString()
      case "fastest":
        return a.quote.timeInSec - b.quote.timeInSec
      case "cheapest":
        return a.fees - b.fees
      case "decentalised":
        return b.quote.decentralisationScore - a.quote.decentralisationScore
      default:
        return 0
    }
  })
}

/**
 * Select the best quote: prefer the user's chosen protocol, fall back to the top-sorted quote.
 */
export const selectQuote = (
  sortedQuotes: QuoteWithFees[],
  selectedProtocol: SupportedSwapProtocol | null,
  selectedSubProtocol: string | undefined
): BaseQuote | null => {
  if (sortedQuotes.length === 0) return null

  const match = sortedQuotes.find(
    ({ quote }) =>
      quote.protocol === selectedProtocol &&
      (quote.subProtocol ? quote.subProtocol === selectedSubProtocol : true)
  )

  return (match ?? sortedQuotes[0])?.quote ?? null
}
