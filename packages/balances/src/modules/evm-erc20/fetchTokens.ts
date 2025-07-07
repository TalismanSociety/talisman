import { EvmErc20Token, evmErc20TokenId, EvmErc20TokenSchema } from "@talismn/chaindata-provider"
import { assign } from "lodash"

import log from "../../log"
import { IBalanceModule } from "../IBalanceModule"
import { MODULE_TYPE, PLATFORM, TokenConfig } from "./config"
import { getErc20ContractData } from "./utils"

const TokenCacheSchema = EvmErc20TokenSchema.pick({
  symbol: true,
  decimals: true,
  name: true,
})

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  tokens,
  connector,
  cache,
}) => {
  const result: EvmErc20Token[] = []

  for (const tokenConfig of tokens) {
    const tokenId = evmErc20TokenId(networkId, tokenConfig.contractAddress)
    if (!cache[tokenId] || !TokenCacheSchema.safeParse(cache[tokenId]).success) {
      const client = await connector.getPublicClientForEvmNetwork(networkId)
      if (!client) {
        log.warn(`No client found for network ${networkId} while fetching EVM ERC20 tokens`)
        continue
      }

      try {
        const { name, decimals, symbol } = await getErc20ContractData(
          client,
          tokenConfig.contractAddress,
        )

        cache[tokenId] = {
          id: tokenId,
          symbol,
          decimals,
          name,
        }
      } catch (err) {
        log.warn(`Failed to fetch ERC20 token data for ${tokenConfig.contractAddress}`, err)
        continue
      }
    }

    const base: Pick<EvmErc20Token, "type" | "networkId" | "platform"> = {
      type: MODULE_TYPE,
      platform: PLATFORM,
      networkId,
    }

    const token = assign(base, cache[tokenId], tokenConfig) as EvmErc20Token

    const parsed = EvmErc20TokenSchema.safeParse(token)
    if (!parsed.success) {
      log.warn("Ignoring token with invalid EvmErc20TokenSchema", token)
      continue
    }

    result.push(parsed.data)
  }

  return result
}
