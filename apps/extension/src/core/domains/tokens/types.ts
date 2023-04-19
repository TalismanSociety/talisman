import { ChainId } from "@core/domains/chains/types"
import { EvmNetworkId } from "@core/domains/ethereum/types"
import { RequestIdOnly } from "@core/types/base"
import { CustomEvmErc20Token } from "@talismn/balances-evm-erc20"
import type { CustomEvmErc20Token as CustomErc20Token } from "@talismn/balances-evm-erc20"

export type { CustomErc20Token }
export type { Token, TokenId, TokenList, IToken } from "@talismn/chaindata-provider"
export type { EvmNativeToken, CustomEvmNativeToken } from "@talismn/balances-evm-native"
export type {
  SubNativeToken as NativeToken,
  CustomSubNativeToken as CustomNativeToken,
} from "@talismn/balances-substrate-native"
export type { SubOrmlToken as OrmlToken } from "@talismn/balances-substrate-orml"
export type { EvmErc20Token as Erc20Token } from "@talismn/balances-evm-erc20"
export type { TokenRateCurrency, TokenRates } from "@talismn/token-rates"

// orml tokens types -----------------------

export type CustomEvmErc20TokenCreate = Pick<
  CustomEvmErc20Token,
  "symbol" | "decimals" | "coingeckoId" | "contractAddress" | "image"
> & { chainId?: ChainId; evmNetworkId?: EvmNetworkId }

/**
 * TODO: Refactor to remove the old types and replace with the new types:
 *   NativeToken -> SubNativeToken
 *   CustomNativeToken -> CustomSubNativeToken
 *   OrmlToken -> SubOrmlToken
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
