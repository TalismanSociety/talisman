import { TokenOfType, TokenType } from "@talismn/chaindata-provider"

import { TokensWithAddresses } from "../IBalanceModule"

export type BalanceDef<T extends TokenType = TokenType> = {
  token: TokenOfType<T>
  address: `0x${string}`
}

export const getBalanceDefs = <T extends TokenType = TokenType>(
  addressesByToken: TokensWithAddresses,
): BalanceDef<T>[] => {
  return addressesByToken.flatMap(([token, addresses]) =>
    addresses.map((address) => ({ token, address })),
  ) as BalanceDef<T>[]
}
