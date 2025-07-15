import { TokenOfType, TokenType } from "@talismn/chaindata-provider"

import { TokenPlatform, TokensWithAddresses } from "../../types/IBalanceModule"

export type BalanceDef<T extends TokenType = TokenType> = {
  token: TokenOfType<T>
  address: TokenPlatform<T> extends "ethereum" ? `0x${string}` : string
}

export const getBalanceDefs = <T extends TokenType = TokenType>(
  addressesByToken: TokensWithAddresses,
): BalanceDef<T>[] => {
  return addressesByToken.flatMap(([token, addresses]) =>
    addresses.map((address) => ({ token, address })),
  ) as BalanceDef<T>[]
}

// esponse of getStorageAt queries:
// if there is at least one storage entry, the results will be an array with a single object
// if the storage has no entries in it (ex: Assets on ewx or moonbeam), the response will be an empty array
export type QueryStorageChange = [stateKey: `0x${string}`, value: `0x${string}`]
export type QueryStorageResult = [{ block: `0x${string}`; changes: QueryStorageChange[] }] | []
