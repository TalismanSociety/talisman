import { CustomErc20TokenCreate } from "@core/domains/tokens/types"
import { imgSrcToDataURL } from "blob-util"
import { ethers } from "ethers"

import { getCoinGeckoErc20Coin } from "./coingecko/getCoinGeckoErc20Coin"
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

  let image: string | undefined = undefined

  try {
    if (coinGeckoData?.image?.small)
      image = await imgSrcToDataURL(coinGeckoData?.image?.small, undefined, "anonymous")
  } catch (err) {
    // image cannot be loaded, might be a CORS issue, but it may exist
    image = coinGeckoData?.image?.small
  }

  return {
    evmNetworkId,
    contractAddress,
    decimals,
    symbol,
    image,
    coingeckoId: coinGeckoData?.id,
  }
}
