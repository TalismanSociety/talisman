import { TokenId } from "@talismn/chaindata-provider"

import { Address } from "../../types"

export class BalanceFetchError extends Error {
  tokenId: TokenId
  address: Address

  constructor(message: string, tokenId: TokenId, address: Address, cause?: Error) {
    super(message)
    this.name = "BalanceFetchError"
    this.tokenId = tokenId
    this.address = address
    if (cause) this.cause = cause
  }
}
export class BalanceFetchNetworkError extends Error {
  evmNetworkId: string | undefined

  constructor(message: string, evmNetworkId?: string, cause?: Error) {
    super(message)
    this.name = "BalanceFetchNetworkError"
    this.evmNetworkId = evmNetworkId
    if (cause) this.cause = cause
  }
}
