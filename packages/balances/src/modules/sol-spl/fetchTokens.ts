import { type SolSplToken, SolSplTokenSchema, solSplTokenId } from "@talismn/chaindata-provider"
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
  const result: SolSplToken[] = []

  for (const tokenConfig of tokens) {
    const tokenId = solSplTokenId(networkId, tokenConfig.mintAddress)
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

    const base: Pick<SolSplToken, "id" | "type" | "networkId" | "platform"> = {
      id: tokenId,
      type: MODULE_TYPE,
      platform: PLATFORM,
      networkId,
    }

    const token = assign(
      base,
      cached?.isValid ? omit(cached, ["isValid"]) : {},
      tokenConfig
    ) as SolSplToken

    const parsed = SolSplTokenSchema.safeParse(token)
    if (!parsed.success) {
      log.warn("Ignoring token with invalid SolSplTokenSchema", {
        token,
      })
      continue
    }

    result.push(parsed.data)
  }

  return result
}
