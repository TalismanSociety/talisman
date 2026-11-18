import type { Balances } from "@talismn/balances"
import type { Token, TokenId } from "@talismn/chaindata-provider"
import type { TokenRateCurrency } from "@talismn/token-rates"

type SortableTokenData = {
  token: Token
  balances: Balances
}

export type SortTokenDataOptions = {
  currency: TokenRateCurrency
  isPriority?: (token: Token) => boolean
  pinnedTokenId?: TokenId
}

type TokenSortKey = {
  isPriority: boolean
  isPinned: boolean
  fiat: number
  hasBalance: boolean
  title: string
}

const SUBNET_NUMBER_DIGITS = 5

/** a dTAO row is titled by its subnet number: its symbol is a glyph that carries no order */
const getTitle = (token: Token) =>
  token.type === "substrate-dtao"
    ? `SN${String(token.netuid).padStart(SUBNET_NUMBER_DIGITS, "0")}`
    : token.symbol

const getSortKey = (
  { token, balances }: SortableTokenData,
  { currency, isPriority, pinnedTokenId }: SortTokenDataOptions
): TokenSortKey => ({
  isPriority: isPriority?.(token) ?? false,
  isPinned: token.id === pinnedTokenId,
  fiat: balances.count ? balances.sum.fiat(currency).transferable : 0,
  hasBalance: balances.each.some((balance) => balance.transferable.planck > 0n),
  title: getTitle(token),
})

const compareByCodeUnit = (a: string, b: string) => {
  if (a > b) return 1
  if (a < b) return -1
  return 0
}

const compareSortKeys = (a: TokenSortKey, b: TokenSortKey) => {
  if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
  if (a.fiat > b.fiat) return -1
  if (a.fiat < b.fiat) return 1
  if (a.hasBalance !== b.hasBalance) return a.hasBalance ? -1 : 1
  return compareByCodeUnit(a.title, b.title)
}

export const sortTokenData = <T extends SortableTokenData>(
  tokens: T[],
  options: SortTokenDataOptions
): T[] =>
  tokens
    .map((data) => ({ data, key: getSortKey(data, options) }))
    .sort((a, b) => compareSortKeys(a.key, b.key))
    .map(({ data }) => data)
