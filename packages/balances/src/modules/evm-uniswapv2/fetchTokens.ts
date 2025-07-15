import {
  EvmUniswapV2Token,
  evmUniswapV2TokenId,
  EvmUniswapV2TokenSchema,
} from "@talismn/chaindata-provider"
import { assign, omit } from "lodash-es"
import { BaseError } from "viem"
import z from "zod/v4"

import log from "../../log"
import { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE, PLATFORM, TokenConfig } from "./config"
import { getErc20ContractData, getUniswapV2PairContractData } from "./utils"

const TokenCacheSchema = z.discriminatedUnion("isValid", [
  z.strictObject({
    id: EvmUniswapV2TokenSchema.shape.id,
    isValid: z.literal(true),
    ...EvmUniswapV2TokenSchema.pick({
      symbol: true,
      decimals: true,
      name: true,
      tokenAddress0: true,
      tokenAddress1: true,
      decimals0: true,
      decimals1: true,
      symbol0: true,
      symbol1: true,
    }).shape,
  }),
  z.strictObject({
    id: EvmUniswapV2TokenSchema.shape.id,
    isValid: z.literal(false),
  }),
])

type CachedToken = z.infer<typeof TokenCacheSchema>

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  tokens,
  connector,
  cache,
}) => {
  const result: EvmUniswapV2Token[] = []

  for (const tokenConfig of tokens) {
    const tokenId = evmUniswapV2TokenId(networkId, tokenConfig.contractAddress)
    const cached = (cache[tokenId] && TokenCacheSchema.safeParse(cache[tokenId]).data) as
      | CachedToken
      | undefined

    if (!cached) {
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

        cache[tokenId] = TokenCacheSchema.parse({
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
          isValid: true,
        })
      } catch (err) {
        const msg = (err as BaseError).shortMessage
        if (
          msg.includes("returned no data") ||
          msg.includes("is out of bounds") ||
          msg.includes("reverted")
        ) {
          cache[tokenId] = { id: tokenId, isValid: false }
        } else {
          log.warn(
            `Failed to fetch UniswapV2 token data for ${tokenConfig.contractAddress}`,
            (err as BaseError).shortMessage,
          )
        }
        continue
      }
    }

    const base: Pick<EvmUniswapV2Token, "id" | "type" | "networkId" | "platform"> = {
      id: tokenId,
      type: MODULE_TYPE,
      platform: PLATFORM,
      networkId,
    }

    const cached2 = (cache[tokenId] && TokenCacheSchema.safeParse(cache[tokenId]).data) as
      | CachedToken
      | undefined

    if (cached2?.isValid === false) continue

    const token = assign(
      base,
      cached2?.isValid ? omit(cached2, ["isValid"]) : {},
      tokenConfig,
    ) as EvmUniswapV2Token

    const parsed = EvmUniswapV2TokenSchema.safeParse(token)
    if (!parsed.success) {
      log.warn("Ignoring token with invalid schema", token)
      continue
    }

    result.push(parsed.data)
  }

  return result
}
