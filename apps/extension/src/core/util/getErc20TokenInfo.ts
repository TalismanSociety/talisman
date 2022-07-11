import { CustomErc20TokenCreate } from "@core/domains/tokens/types"
import { ethers } from "ethers"

import { getBase64ImageFromUrl } from "./getBase64ImageFromUrl"
import { getCoinGeckoErc20Coin } from "./getCoinGeckoErc20Coin"
import { getErc20ContractData } from "./getErc20ContractData"

export const getErc20TokenInfo = async (
  provider: ethers.providers.JsonRpcProvider,
  evmNetworkId: number,
  contractAddress: string
): Promise<CustomErc20TokenCreate> => {
  const [{ decimals, symbol }, coinGeckoData] = await Promise.all([
    getErc20ContractData(provider, contractAddress),
    getCoinGeckoErc20Coin(evmNetworkId, contractAddress),
  ])

  const image = coinGeckoData?.image?.large
    ? await getBase64ImageFromUrl(coinGeckoData.image.large)
    : undefined

  return {
    evmNetworkId,
    contractAddress,
    decimals,
    symbol,
    image,
    coingeckoId: coinGeckoData?.id,
  }
}
