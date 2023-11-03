import { StorageProvider } from "@core/libs/Store"
import { Token, TokenId } from "@talismn/chaindata-provider"

import { CustomErc20Token, CustomEvmNativeToken, CustomNativeToken } from "./types"

export type EnabledTokens = Record<TokenId, boolean>

/**
 * Stores the enabled state of each token, if and only if the user has overriden it.
 * Enabled state is stored aside of the database table, to allow for bulk reset of the table on a regular basis
 * Default enabled state is stored in the chaindata-provider, in the isDefault property.
 * We only store overrides here to reduce storage consumption.
 */
class EnabledTokensStore extends StorageProvider<EnabledTokens> {
  constructor(initialData = {}) {
    super("enabledTokens", initialData)
  }

  async setEnabled(tokenId: TokenId, enabled: boolean) {
    const enabledTokens = await this.get()
    await this.set({ ...enabledTokens, [tokenId]: enabled })
  }
}

export const enabledTokensStore = new EnabledTokensStore()

type CustomToken = CustomErc20Token | CustomNativeToken | CustomEvmNativeToken
const isCustomToken = (token: Token | CustomToken): token is CustomToken => {
  return "isCustom" in token && !!token.isCustom
}

export const isTokenEnabled = (
  token: Token | CustomErc20Token | CustomNativeToken | CustomEvmNativeToken,
  enabledTokens: EnabledTokens
) => {
  return enabledTokens[token.id] ?? (isCustomToken(token) || token.isDefault)
}
