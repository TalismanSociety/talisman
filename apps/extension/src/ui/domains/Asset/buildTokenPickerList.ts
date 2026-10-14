import { Balances } from "@talismn/balances"
import type { Token } from "@talismn/chaindata-provider"
import groupBy from "lodash-es/groupBy"

import { type SortTokenDataOptions, sortTokenData } from "./sortTokenData"

const EMPTY_BALANCES = new Balances([])

type BuildTokenPickerListOptions = SortTokenDataOptions & {
  showEmptyBalances?: boolean
}

export const buildTokenPickerList = <T extends { token: Token }>(
  tokens: T[],
  balances: Balances,
  { showEmptyBalances, ...sortOptions }: BuildTokenPickerListOptions
): Array<T & { balances: Balances }> => {
  if (!showEmptyBalances && !balances.count) return []

  const balancesByTokenId = groupBy(balances.each, "tokenId")

  const withBalances = tokens.map((data) => {
    const tokenBalances = balancesByTokenId[data.token.id]
    return { ...data, balances: tokenBalances ? new Balances(tokenBalances) : EMPTY_BALANCES }
  })

  const listedTokens = showEmptyBalances
    ? withBalances
    : withBalances.filter((data) => data.balances.sum.planck.transferable > 0n)

  return sortTokenData(listedTokens, sortOptions)
}
