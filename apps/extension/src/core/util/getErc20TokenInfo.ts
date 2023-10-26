import { EvmAddress, EvmNetworkId } from "@core/domains/ethereum/types"
import { CustomErc20TokenCreate } from "@core/domains/tokens/types"
import { ethers } from "ethers"
import { Client } from "viem"

import { getCoinGeckoErc20Coin } from "./coingecko/getCoinGeckoErc20Coin"
import { getErc20ContractData, getErc20ContractDataOld } from "./getErc20ContractData"

/**
 * @deprecated use viem
 */
export const getErc20TokenInfoOld = async (
  provider: ethers.providers.JsonRpcProvider,
  evmNetworkId: EvmNetworkId,
  contractAddress: EvmAddress
): Promise<CustomErc20TokenCreate> => {
  const [{ decimals, symbol }, coinGeckoData] = await Promise.all([
    getErc20ContractDataOld(provider, contractAddress),
    getCoinGeckoErc20Coin(evmNetworkId, contractAddress),
  ])

  return {
    evmNetworkId,
    contractAddress,
    decimals,
    symbol,
    image: coinGeckoData?.image.small,
    coingeckoId: coinGeckoData?.id,
  }
}

export const getErc20TokenInfo = async (
  client: Client,
  evmNetworkId: EvmNetworkId,
  contractAddress: `0x${string}`
): Promise<CustomErc20TokenCreate> => {
  const [{ decimals, symbol }, coinGeckoData] = await Promise.all([
    getErc20ContractData(client, contractAddress),
    getCoinGeckoErc20Coin(evmNetworkId, contractAddress),
  ])

  return {
    evmNetworkId,
    contractAddress,
    decimals,
    symbol,
    image: coinGeckoData?.image.small,
    coingeckoId: coinGeckoData?.id,
  }
}
