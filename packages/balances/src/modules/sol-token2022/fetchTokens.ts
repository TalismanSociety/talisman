import {
  type SolToken2022Token,
  SolToken2022TokenSchema,
  solToken2022TokenId,
} from "@talismn/chaindata-provider"
import { assign, omit } from "lodash-es"

import log from "../../log"
import type { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE, PLATFORM, type TokenConfig } from "./config"
import { type CachedToken, fetchOnChainTokenData, TokenCacheSchema } from "./onChainTokenMetadata"

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  tokens,
  connector,
  cache,
}) => {
  const result: SolToken2022Token[] = []

  for (const tokenConfig of tokens) {
    const tokenId = solToken2022TokenId(networkId, tokenConfig.mintAddress)
    let cached = (cache[tokenId] && TokenCacheSchema.safeParse(cache[tokenId]).data) as
      | CachedToken
      | undefined

    if (!cached) {
      const tokenInfo = await fetchOnChainTokenData(connector, tokenId)
      if (tokenInfo) cache[tokenId] = tokenInfo
    }

    cached = (cache[tokenId] && TokenCacheSchema.safeParse(cache[tokenId]).data) as
      | CachedToken
      | undefined

    if (cached?.isValid === false) continue

    const base: Pick<SolToken2022Token, "id" | "type" | "networkId" | "platform"> = {
      id: tokenId,
      type: MODULE_TYPE,
      platform: PLATFORM,
      networkId,
    }

    const token = assign(
      base,
      cached?.isValid ? omit(cached, ["isValid"]) : {},
      tokenConfig
    ) as SolToken2022Token

    const parsed = SolToken2022TokenSchema.safeParse(token)
    if (!parsed.success) {
      log.warn("Ignoring token with invalid SolToken2022TokenSchema", {
        token,
      })
      continue
    }

    result.push(parsed.data)
  }

  return result
}
