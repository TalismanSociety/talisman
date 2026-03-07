import type { BalancesResult, IBalance } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"

import type { Address } from "../../types/base"

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
