import { TokenOfType, TokenType } from "@talismn/chaindata-provider"

import { PlatformOf, TokensWithAddresses } from "../IBalanceModule"

export type BalanceDef<T extends TokenType = TokenType> = {
  token: TokenOfType<T>
  address: PlatformOf<T> extends "ethereum" ? `0x${string}` : string
}

export const getBalanceDefs = <T extends TokenType = TokenType>(
  addressesByToken: TokensWithAddresses,
): BalanceDef<T>[] => {
  return addressesByToken.flatMap(([token, addresses]) =>
    addresses.map((address) => ({ token, address })),
  ) as BalanceDef<T>[]
}
