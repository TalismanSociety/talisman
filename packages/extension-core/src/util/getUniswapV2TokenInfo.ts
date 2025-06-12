import { githubTokenLogoUrl } from "@talismn/chaindata-provider"
import { Client } from "viem"

import { EvmAddress, EvmNetworkId } from "../domains/ethereum/types"
import { CustomEvmUniswapV2TokenCreate } from "../domains/tokens/types"
import { getCoinGeckoErc20Coin } from "./coingecko/getCoinGeckoErc20Coin"
import { getUniswapV2ContractData } from "./getUniswapV2ContractData"

export const getUniswapV2TokenInfo = async (
  client: Client,
  networkId: EvmNetworkId,
  contractAddress: EvmAddress,
): Promise<CustomEvmUniswapV2TokenCreate> => {
  const { symbol, decimals, tokenAddress0, tokenAddress1, token0, token1, name } =
    await getUniswapV2ContractData(client, contractAddress)

  const [coingecko0, coingecko1] = await Promise.all([
    getCoinGeckoErc20Coin(networkId, tokenAddress0),
    getCoinGeckoErc20Coin(networkId, tokenAddress1),
  ])

  return {
    type: "evm-uniswapv2",
    symbol,
    name,
    decimals,
    logo: githubTokenLogoUrl("uniswap"),
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
