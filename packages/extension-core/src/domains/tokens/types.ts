import type { CustomEvmErc20Token, CustomEvmUniswapV2Token } from "@talismn/balances"
import type { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"

import { RequestIdOnly } from "../../types/base"

export interface TokenMessages {
  // token message signatures
  "pri(tokens.subscribe)": [null, boolean, boolean]

  // custom evm token management
  "pri(tokens.evm.custom.add)": [CustomEvmTokenCreate, boolean]
  "pri(tokens.evm.custom.remove)": [RequestIdOnly, boolean]
}

export type CustomEvmTokenCreate = CustomEvmErc20TokenCreate | CustomEvmUniswapV2TokenCreate

export type CustomEvmErc20TokenCreate = Pick<
  CustomEvmErc20Token,
  "type" | "symbol" | "decimals" | "coingeckoId" | "contractAddress" | "image"
> & { chainId?: ChainId; evmNetworkId?: EvmNetworkId }

export type CustomEvmUniswapV2TokenCreate = Pick<
  CustomEvmUniswapV2Token,
  | "type"
  | "symbol"
  | "decimals"
  | "contractAddress"
  | "symbol0"
  | "symbol1"
  | "decimals0"
  | "decimals1"
  | "tokenAddress0"
  | "tokenAddress1"
  | "coingeckoId0"
  | "coingeckoId1"
  | "image"
> & { chainId?: ChainId; evmNetworkId?: EvmNetworkId }
