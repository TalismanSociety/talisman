import { subDTaoTokenId, Token, TokenId, TokenList } from "@talismn/chaindata-provider"

import { StorageProvider } from "../../libs/Store"

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

  async setActive(tokenId: TokenId, active: boolean) {
    const activeTokens = await this.get()
    if (activeTokens[tokenId] === active) return
    await this.set({ ...activeTokens, [tokenId]: Boolean(active) })
  }

  async resetActive(tokenId: TokenId) {
    await this.delete(tokenId)
  }
}

export const activeTokensStore = new ActiveTokensStore()

export const isTokenActive = (token: Token, activeTokens: ActiveTokens) => {
  if (token.type === "substrate-dtao" && token.hotkey) {
    const templateTokenId = subDTaoTokenId(token.networkId, token.netuid)
    return Boolean(activeTokens[templateTokenId] ?? token.isDefault ?? false)
  }
  return Boolean(activeTokens[token.id] ?? token.isDefault ?? false)
}

export const filterActiveTokens = (tokens: TokenList, activeTokens: ActiveTokens) => {
  return Object.fromEntries(
    Object.entries(tokens).filter(([, token]) => isTokenActive(token as Token, activeTokens)),
  ) as TokenList
}
