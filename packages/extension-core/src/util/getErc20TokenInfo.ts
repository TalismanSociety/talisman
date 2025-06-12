import { Client } from "viem"

import { EvmAddress, EvmNetworkId } from "../domains/ethereum/types"
import { CustomEvmErc20TokenCreate } from "../domains/tokens/types"
import { getCoinGeckoErc20Coin } from "./coingecko/getCoinGeckoErc20Coin"
import { getErc20ContractData } from "./getErc20ContractData"

export const getErc20TokenInfo = async (
  client: Client,
  networkId: EvmNetworkId,
  contractAddress: EvmAddress,
): Promise<CustomEvmErc20TokenCreate> => {
  const [{ decimals, symbol, name }, coinGeckoData] = await Promise.all([
    getErc20ContractData(client, contractAddress),
    getCoinGeckoErc20Coin(networkId, contractAddress),
  ])

  return {
    type: "evm-erc20",
    networkId,
    contractAddress,
    decimals,
    symbol,
    name,
    logo: coinGeckoData?.image.small,
    coingeckoId: coinGeckoData?.id,
  }
}
