import { type EthNetworkId, type EvmErc20Token, evmErc20TokenId } from "@talismn/chaindata-provider"
import type { Client } from "viem"

import type { EvmAddress } from "../domains/ethereum/types"
import { getCoinGeckoErc20Coin } from "./coingecko/getCoinGeckoErc20Coin"
import { getErc20ContractData } from "./getErc20ContractData"

export const getErc20TokenInfo = async (
  client: Client,
  networkId: EthNetworkId,
  contractAddress: EvmAddress,
  signal?: AbortSignal
): Promise<EvmErc20Token> => {
  const [{ decimals, symbol, name }, coinGeckoData] = await Promise.all([
    getErc20ContractData(client, contractAddress),
    getCoinGeckoErc20Coin(networkId, contractAddress, signal),
  ])

  return {
    id: evmErc20TokenId(networkId, contractAddress),
    type: "evm-erc20",
    platform: "ethereum",
    networkId,
    contractAddress,
    decimals,
    symbol,
    name,
    logo: coinGeckoData?.image.small,
    coingeckoId: coinGeckoData?.id,
  }
}
