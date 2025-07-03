import {
  EthNetworkId,
  EvmUniswapV2Token,
  evmUniswapV2TokenId,
  getGithubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import { Client } from "viem"

import { EvmAddress } from "../domains/ethereum/types"
import { getCoinGeckoErc20Coin } from "./coingecko/getCoinGeckoErc20Coin"
import { getUniswapV2ContractData } from "./getUniswapV2ContractData"

export const getUniswapV2TokenInfo = async (
  client: Client,
  networkId: EthNetworkId,
  contractAddress: EvmAddress,
  signal?: AbortSignal,
): Promise<EvmUniswapV2Token> => {
  const { symbol, decimals, tokenAddress0, tokenAddress1, token0, token1, name } =
    await getUniswapV2ContractData(client, contractAddress)

  const [coingecko0, coingecko1] = await Promise.all([
    getCoinGeckoErc20Coin(networkId, tokenAddress0, signal),
    getCoinGeckoErc20Coin(networkId, tokenAddress1, signal),
  ])

  return {
    id: evmUniswapV2TokenId(networkId, contractAddress),
    type: "evm-uniswapv2",
    platform: "ethereum",
    symbol,
    name,
    decimals,
    logo: getGithubTokenLogoUrl("uniswap"),
    symbol0: token0.symbol,
    symbol1: token1.symbol,
    decimals0: token0.decimals,
    decimals1: token1.decimals,
    contractAddress,
    tokenAddress0,
    tokenAddress1,
    coingeckoId0: coingecko0?.id,
    coingeckoId1: coingecko1?.id,
    networkId,
  }
}
