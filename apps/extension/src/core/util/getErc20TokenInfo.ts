import { EvmNetworkId } from "@core/domains/ethereum/types"
import { CustomErc20TokenCreate } from "@core/domains/tokens/types"
import { ethers } from "ethers"

import { getCoinGeckoErc20Coin } from "./coingecko/getCoinGeckoErc20Coin"
import { getErc20ContractData } from "./getErc20ContractData"

export const getErc20TokenInfo = async (
  provider: ethers.providers.JsonRpcProvider,
  evmNetworkId: EvmNetworkId,
  contractAddress: string
): Promise<CustomErc20TokenCreate> => {
  const [{ decimals, symbol }, coinGeckoData] = await Promise.all([
    getErc20ContractData(provider, contractAddress),
    getCoinGeckoErc20Coin(evmNetworkId, contractAddress),
  ])

  const image = coinGeckoData?.image?.small

  return {
    evmNetworkId,
    contractAddress,
    decimals,
    symbol,
    image,
    coingeckoId: coinGeckoData?.id,
  }
}
