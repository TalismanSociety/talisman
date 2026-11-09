import type { TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import type { TokenRatesList } from "@talismn/token-rates"
import BigNumber from "bignumber.js"
import type {
  BaseQuote,
  QuoteFee,
  QuoteLeg,
  SupportedSwapProtocol,
} from "../swap-modules/common.swap-module"

export type QuoteSorting = "decentalised" | "cheapest" | "fastest" | "bestRate"

/** A token the route spends from an account that holds less of it than `required` */
export type Shortfall = { tokenId: TokenId; required: bigint; available: bigint }

/** `netUsd` is null when the output token or a fee paid on top has no rate */
export type QuoteWithFees = {
  quote: BaseQuote
  fees: number
  netUsd: number | null
  shortfall: Shortfall | null
}

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
    shortfall: null,
  }))

export const toPlanck = (fee: QuoteFee, decimals: number) =>
  BigNumber(fee.amount).shiftedBy(decimals).integerValue(BigNumber.ROUND_CEIL).toFixed()

const sumPlanck = (fees: QuoteFee[], tokenId: TokenId, decimals: number) =>
  fees
    .filter((fee) => fee.tokenId === tokenId)
    .reduce((total, fee) => total + BigInt(toPlanck(fee, decimals)), 0n)

/** Sum of the additional fees charged in `tokenId`, the amount the account must hold on top of gas */
export const getAdditionalFeePlanck = (fees: QuoteFee[], tokenId: TokenId, decimals: number) =>
  sumPlanck(
    fees.filter((fee) => fee.additional),
    tokenId,
    decimals
  )

const isPaidOnTop = (fee: QuoteFee) => fee.additional || fee.gas

export type HoldingKey = { address: string; tokenId: TokenId }
export type Holding = HoldingKey & { decimals: number; transferable: bigint }

/**
 * The tokens a later leg spends from its signer's own balance: its gas and the fees charged on top,
 * except in the token it receives, which it pays out of what the previous leg delivers.
 */
export const getLaterLegHoldingKeys = (quote: BaseQuote): HoldingKey[] =>
  quote.legs
    .slice(1)
    .flatMap(({ signer, fromTokenId, fees }) =>
      signer
        ? fees
            .filter((fee) => isPaidOnTop(fee) && fee.tokenId !== fromTokenId)
            .map((fee) => ({ address: signer, tokenId: fee.tokenId }))
        : []
    )

type FirstLegGas = { tokenId: TokenId; planck: bigint }

/** The first leg's gas counts only when given, as the confirm screen estimates it live */
const getLegSpend = (
  leg: QuoteLeg,
  index: number,
  holding: Holding,
  firstLegGas: FirstLegGas | null
) => {
  if (!leg.signer || !isAddressEqual(leg.signer, holding.address)) return 0n
  if (index === 0)
    return (
      (leg.fromTokenId === holding.tokenId ? leg.inputAmount : 0n) +
      (firstLegGas?.tokenId === holding.tokenId ? firstLegGas.planck : 0n) +
      getAdditionalFeePlanck(leg.fees, holding.tokenId, holding.decimals)
    )
  if (leg.fromTokenId === holding.tokenId) return 0n
  return sumPlanck(leg.fees.filter(isPaidOnTop), holding.tokenId, holding.decimals)
}

/** The first holding, in the given order, that cannot pay what the route spends from it */
export const getShortfall = (
  quote: BaseQuote,
  holdings: Holding[],
  firstLegGas: FirstLegGas | null = null
): Shortfall | null =>
  holdings
    .map((holding) => ({
      tokenId: holding.tokenId,
      required: quote.legs.reduce(
        (total, leg, index) => total + getLegSpend(leg, index, holding, firstLegGas),
        0n
      ),
      available: holding.transferable,
    }))
    .find(({ required, available }) => required > available) ?? null

/** Mark the quotes the holdings cannot pay for. A holding whose balance is unknown is left out. */
export const attachShortfalls = (quotes: QuoteWithFees[], holdings: Holding[]): QuoteWithFees[] =>
  quotes.map((entry) => {
    const shortfall = getShortfall(entry.quote, holdings)
    return shortfall ? { ...entry, shortfall } : entry
  })

/**
 * Sort quotes according to the chosen sorting strategy, the ones the account can pay for first.
 */
export const sortQuotes = (quotes: QuoteWithFees[], sorting: QuoteSorting): QuoteWithFees[] => {
  const isEveryNetValueKnown = quotes.every(({ netUsd }) => netUsd !== null)
  return [...quotes].sort((a, b) => {
    if (!a.shortfall !== !b.shortfall) return a.shortfall ? 1 : -1
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

/**
 * Whether the selected route can stay selected: it is still quoted, and the account can pay for it
 * unless it can pay for none.
 */
export const isSelectionAvailable = (
  sortedQuotes: QuoteWithFees[],
  selectedProtocol: SupportedSwapProtocol | null,
  selectedSubProtocol: string | undefined
): boolean => {
  const isEveryQuoteShort = !!sortedQuotes[0]?.shortfall
  return sortedQuotes.some(
    ({ quote, shortfall }) =>
      quote.protocol === selectedProtocol &&
      (quote.subProtocol ? quote.subProtocol === selectedSubProtocol : true) &&
      (!shortfall || isEveryQuoteShort)
  )
}
