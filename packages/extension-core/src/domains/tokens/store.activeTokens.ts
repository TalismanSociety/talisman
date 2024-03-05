import { Token, TokenId, TokenList } from "@talismn/chaindata-provider"

import { StorageProvider } from "../../libs/Store"
import { CustomErc20Token, CustomEvmNativeToken, CustomNativeToken } from "./types"

export type ActiveTokens = Record<TokenId, boolean>

/**
 * Stores the active state of each token, if and only if the user has overriden it.
 * Active state is stored aside of the database table, to allow for bulk reset of the table on a regular basis
 * Default active state is stored in the chaindata-provider, in the isDefault property.
 * We only store overrides here to reduce storage consumption.
 */
class ActiveTokensStore extends StorageProvider<ActiveTokens> {
  constructor(initialData = {}) {
    super("activeTokens", initialData)
  }

  async setActive(tokenId: TokenId, enabled: boolean) {
    const activeTokens = await this.get()
    await this.set({ ...activeTokens, [tokenId]: enabled })
  }

  async resetActive(tokenId: TokenId) {
    await this.delete(tokenId)
  }
}

export const activeTokensStore = new ActiveTokensStore()

type CustomToken = CustomErc20Token | CustomNativeToken | CustomEvmNativeToken
const isCustomToken = (token: Token | CustomToken): token is CustomToken => {
  return "isCustom" in token && !!token.isCustom
}

export const isTokenActive = (
  token: Token | CustomErc20Token | CustomNativeToken | CustomEvmNativeToken,
  activeTokens: ActiveTokens
) => {
  return activeTokens[token.id] ?? (isCustomToken(token) || token.isDefault)
}

export const filterActiveTokens = (tokens: TokenList, activeTokens: ActiveTokens) => {
  return Object.fromEntries(
    Object.entries(tokens).filter(([, token]) => isTokenActive(token as Token, activeTokens))
  ) as TokenList
}
