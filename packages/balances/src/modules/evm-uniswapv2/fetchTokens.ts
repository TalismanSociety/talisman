import {
  EvmUniswapV2Token,
  evmUniswapV2TokenId,
  EvmUniswapV2TokenSchema,
} from "@talismn/chaindata-provider"
import { assign } from "lodash"
import { BaseError } from "viem"

import log from "../../log"
import { IBalanceModule } from "../IBalanceModule"
import { MODULE_TYPE, PLATFORM, TokenConfig } from "./config"
import { getErc20ContractData, getUniswapV2PairContractData } from "./utils"

const TokenCacheSchema = EvmUniswapV2TokenSchema.pick({
  symbol: true,
  decimals: true,
  name: true,
  tokenAddress0: true,
  tokenAddress1: true,
  decimals0: true,
  decimals1: true,
  symbol0: true,
  symbol1: true,
})

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  tokens,
  connector,
  cache,
}) => {
  const result: EvmUniswapV2Token[] = []

  for (const tokenConfig of tokens) {
    const tokenId = evmUniswapV2TokenId(networkId, tokenConfig.contractAddress)
    if (!cache[tokenId] || !TokenCacheSchema.safeParse(cache[tokenId]).success) {
      const client = await connector.getPublicClientForEvmNetwork(networkId)
      if (!client) {
        log.warn(`No client found for network ${networkId} while fetching EVM ERC20 tokens`)
        continue
      }

      try {
        const { token0, token1, name, decimals } = await getUniswapV2PairContractData(
          client,
          tokenConfig.contractAddress,
        )

        const { symbol: symbol0, decimals: decimals0 } = await getErc20ContractData(client, token0)
        const { symbol: symbol1, decimals: decimals1 } = await getErc20ContractData(client, token1)

        cache[tokenId] = {
          id: tokenId,
          symbol: `${symbol0}/${symbol1}`,
          decimals,
          name,
          tokenAddress0: token0,
          tokenAddress1: token1,
          decimals0,
          decimals1,
          symbol0,
          symbol1,
        }
      } catch (err) {
        log.warn(
          `Failed to fetch UniswapV2 token data for ${tokenConfig.contractAddress}`,
          (err as BaseError).shortMessage,
        )
        continue
      }
    }

    const base: Pick<EvmUniswapV2Token, "type" | "networkId" | "platform"> = {
      type: MODULE_TYPE,
      platform: PLATFORM,
      networkId,
    }

    const token = assign(base, cache[tokenId], tokenConfig) as EvmUniswapV2Token

    const parsed = EvmUniswapV2TokenSchema.safeParse(token)
    if (!parsed.success) {
      log.warn("Ignoring token with invalid EvmErc20TokenSchema", token)
      continue
    }

    result.push(parsed.data)
  }

  return result
}
