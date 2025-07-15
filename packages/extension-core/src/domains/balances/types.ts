import { BalancesResult, IBalance } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { TokenRateCurrency } from "@talismn/token-rates"

import { Address } from "../../types/base"

export interface RequestBalance {
  tokenId: TokenId
  address: Address
}

export type BalanceSubscriptionResponse = BalancesResult

export type AddressesAndTokens = {
  addresses: Address[]
  tokenIds: TokenId[]
}
export interface RequestBalancesByParamsSubscribe {
  addressesAndTokens: AddressesAndTokens
}

export type BalanceTotal = {
  address: Address
  total: number
  currency: TokenRateCurrency
}

export interface BalancesMessages {
  // balance message signatures
  "pri(balances.get)": [RequestBalance, IBalance | null]
  "pri(balances.subscribe)": [null, boolean, BalanceSubscriptionResponse]
  "pri(balances.byparams.subscribe)": [
    RequestBalancesByParamsSubscribe,
    boolean,
    BalanceSubscriptionResponse,
  ]
}
