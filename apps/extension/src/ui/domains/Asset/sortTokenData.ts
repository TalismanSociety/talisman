import type { Balances } from "@talismn/balances"
import { subNativeTokenId, type Token, type TokenId } from "@talismn/chaindata-provider"
import type { TokenRateCurrency } from "@talismn/token-rates"
import { isTransferableToken } from "@ui/util/isTransferableToken"

type SortableTokenData = {
  id: TokenId
  token: Token
  balances: Balances
}

type SortTokenDataOptions = {
  currency: TokenRateCurrency
  isPriority?: (token: Token) => boolean
  pinnedTokenId?: TokenId
}

type TokenSortKey = {
  isPriority: boolean
  isTransferable: boolean
  isPinned: boolean
  fiat: number
  hasBalance: boolean
  nativeRank: number
  symbol: string
}

const POLKADOT_NATIVE_TOKEN_ID = subNativeTokenId("polkadot")
const KUSAMA_NATIVE_TOKEN_ID = subNativeTokenId("kusama")

const getNativeRank = (tokenId: TokenId) => {
  if (tokenId === POLKADOT_NATIVE_TOKEN_ID) return 0
  if (tokenId === KUSAMA_NATIVE_TOKEN_ID) return 1
  return 2
}

const getSortKey = (
  { id, token, balances }: SortableTokenData,
  { currency, isPriority, pinnedTokenId }: SortTokenDataOptions
): TokenSortKey => ({
  isPriority: isPriority?.(token) ?? false,
  isTransferable: isTransferableToken(token),
  isPinned: id === pinnedTokenId,
  fiat: balances.sum.fiat(currency).transferable,
  hasBalance: balances.each.some((balance) => balance.transferable.planck > 0n),
  nativeRank: getNativeRank(token.id),
  symbol: token.symbol,
})

const compareSortKeys = (a: TokenSortKey, b: TokenSortKey) => {
  if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1
  if (a.isTransferable !== b.isTransferable) return a.isTransferable ? -1 : 1
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
  if (a.fiat > b.fiat) return -1
  if (a.fiat < b.fiat) return 1
  if (a.hasBalance !== b.hasBalance) return a.hasBalance ? -1 : 1
  if (a.nativeRank !== b.nativeRank) return a.nativeRank - b.nativeRank
  // code-unit order, not locale order: the list has always sorted symbols this way
  if (a.symbol > b.symbol) return 1
  if (a.symbol < b.symbol) return -1
  return 0
}

export const sortTokenData = <T extends SortableTokenData>(
  tokens: T[],
  options: SortTokenDataOptions
): T[] =>
  tokens
    .map((data) => ({ data, key: getSortKey(data, options) }))
    .sort((a, b) => compareSortKeys(a.key, b.key))
    .map(({ data }) => data)
