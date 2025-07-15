import { EvmErc20Token, evmErc20TokenId, EvmErc20TokenSchema } from "@talismn/chaindata-provider"
import { assign, omit } from "lodash-es"
import { BaseError } from "viem"
import z from "zod/v4"

import log from "../../log"
import { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE, PLATFORM, TokenConfig } from "./config"
import { getErc20ContractData } from "./utils"

const TokenCacheSchema = z.discriminatedUnion("isValid", [
  z.strictObject({
    id: EvmErc20TokenSchema.shape.id,
    isValid: z.literal(true),
    ...EvmErc20TokenSchema.pick({ symbol: true, decimals: true, name: true }).shape,
  }),
  z.strictObject({
    id: EvmErc20TokenSchema.shape.id,
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
  const result: EvmErc20Token[] = []

  for (const tokenConfig of tokens) {
    const tokenId = evmErc20TokenId(networkId, tokenConfig.contractAddress)
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
        const { name, decimals, symbol } = await getErc20ContractData(
          client,
          tokenConfig.contractAddress,
        )

        cache[tokenId] = TokenCacheSchema.parse({
          id: tokenId,
          symbol,
          decimals,
          name,
          isValid: true,
        })
      } catch (err) {
        const msg = (err as BaseError).shortMessage
        if (
          msg.includes("returned no data") ||
          msg.includes("is out of bounds") ||
          msg.includes("reverted")
        )
          cache[tokenId] = { id: tokenId, isValid: false }
        else
          log.warn(
            `Failed to fetch ERC20 token data for ${networkId}:${tokenConfig.contractAddress}`,
            (err as BaseError).shortMessage,
          )
        continue
      }
    }

    const base: Pick<EvmErc20Token, "id" | "type" | "networkId" | "platform"> = {
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
    ) as EvmErc20Token

    const parsed = EvmErc20TokenSchema.safeParse(token)
    if (!parsed.success) {
      log.warn("Ignoring token with invalid EvmErc20TokenSchema", {
        token,
      })
      continue
    }

    result.push(parsed.data)
  }

  return result
}
