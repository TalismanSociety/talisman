import { Client } from "viem"

import { EvmAddress, EvmNetworkId } from "../domains/ethereum/types"
import { CustomEvmErc20TokenCreate } from "../domains/tokens/types"
import { getCoinGeckoErc20Coin } from "./coingecko/getCoinGeckoErc20Coin"
import { getErc20ContractData } from "./getErc20ContractData"

export const getErc20TokenInfo = async (
  client: Client,
  evmNetworkId: EvmNetworkId,
  contractAddress: EvmAddress
): Promise<CustomEvmErc20TokenCreate> => {
  const [{ decimals, symbol }, coinGeckoData] = await Promise.all([
    getErc20ContractData(client, contractAddress),
    getCoinGeckoErc20Coin(evmNetworkId, contractAddress),
  ])

  return {
    type: "evm-erc20",
    evmNetworkId,
    contractAddress,
    decimals,
    symbol,
    image: coinGeckoData?.image.small,
    coingeckoId: coinGeckoData?.id,
  }
}
