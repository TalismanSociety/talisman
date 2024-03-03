import type { CustomEvmErc20Token as CustomErc20Token } from "@talismn/balances"
import { CustomEvmErc20Token } from "@talismn/balances"

import { ChainId } from "../../domains/chains/types"
import { EvmNetworkId } from "../../domains/ethereum/types"
import { RequestIdOnly } from "../../types/base"

export type {
  EvmErc20Token as Erc20Token,
  CustomEvmNativeToken,
  EvmNativeToken,
  CustomSubNativeToken as CustomNativeToken,
  SubNativeToken as NativeToken,
} from "@talismn/balances"
export type { IToken, Token, TokenId, TokenList } from "@talismn/chaindata-provider"
export type { TokenRateCurrency, TokenRates } from "@talismn/token-rates"
export type { CustomErc20Token }

// orml tokens types -----------------------

export type CustomEvmErc20TokenCreate = Pick<
  CustomEvmErc20Token,
  "symbol" | "decimals" | "coingeckoId" | "contractAddress" | "image"
> & { chainId?: ChainId; evmNetworkId?: EvmNetworkId }

/**
 * TODO: Refactor to remove the old types and replace with the new types:
 *   NativeToken -> SubNativeToken
 *   CustomNativeToken -> CustomSubNativeToken
 *   Erc20Token -> EvmErc20Token
 *   CustomErc20Token -> CustomEvmErc20Token
 *   CustomErc20TokenCreate -> CustomEvmErc20TokenCreate
 */
export type CustomErc20TokenCreate = CustomEvmErc20TokenCreate

export interface TokenMessages {
  // token message signatures
  "pri(tokens.subscribe)": [null, boolean, boolean]

  // custom erc20 token management
  "pri(tokens.erc20.custom.add)": [CustomEvmErc20TokenCreate, boolean]
  "pri(tokens.erc20.custom.remove)": [RequestIdOnly, boolean]
}
